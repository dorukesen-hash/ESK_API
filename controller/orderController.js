const models = require('../db/models')
const { Order, OrderItem, Customer, Shipment, OrderStatus, User, Cart, Invoice, Transaction, Variant, VariantImages, Image, Carrier, DiscountCode, DiscountCodeRedemption } = models
const { Op } = require('sequelize')
const { createAndWhere } = require('./scopes');
const Billing = require('../db/models/billing');
const sendEmail = require('../utils/sendEmail');
const AppError = require('../utils/appError');
const { resolveVariantPrice, resolveOrderPricing } = require('../utils/pricing');
const { logOrderChange } = require('./orderAuditController');
const { ensureCustomerForUser } = require('./customerController');
const { calculatePalletPacking } = require('../utils/palletPacking');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const XLSX = require('xlsx');

// Matches the real orderstatus table (verified live: id 1-6 are Pending,
// In Progress, Completed, On Hold, Cancelled, Refunded - same mapping
// getOrders' status filter above already relies on).
const REFUNDED_STATUS_ID = 6;
const CANCELLED_STATUS_ID = 5;

function generateCustomUniqueId() {
  const now = new Date();
  
  // Tarih bileşenlerini al
  const year = now.getFullYear().toString().slice(-2);    // "25" (2025'in son 2 hanesi)
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // "07" (Temmuz)
  const day = now.getDate().toString().padStart(2, '0');  // "10"
  
  // Zaman bileşenlerini al
  const hours = now.getHours().toString().padStart(2, '0');    // "14"
  const minutes = now.getMinutes().toString().padStart(2, '0'); // "41"
  const seconds = now.getSeconds().toString().padStart(2, '0'); // "55"
  const millis = now.getMilliseconds().toString().padStart(3, '0').slice(0, 2); // "01"
  
  // Tüm bileşenleri birleştir
  const uniqueId = year + month + day + hours + minutes + seconds + millis;
  
  return uniqueId; // Örnek çıktı: "250710144155"
}

// Server-side pallet packing for the Shipment row, using real pack_*
// dimensions/weight from the DB (never client-sent shipping.totalDeci/
// totalWeight, which nothing has ever actually computed correctly). Items
// with missing/invalid package dimensions don't block order creation -
// this is a record-keeping figure, not something checkout should ever
// fail on - they're just excluded and logged.
async function resolvePalletTotalsFromOrderItems(items) {
  const variantIds = [...new Set((items || []).map((i) => i.id))];
  const variants = await Variant.findAll({ where: { id: variantIds } });
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const packItems = (items || [])
    .map((i) => {
      const variant = variantById.get(i.id);
      if (!variant) return null;
      return {
        sku: variant.title || String(variant.id),
        length: variant.pack_length,
        width: variant.pack_width,
        height: variant.pack_height,
        weight: variant.pack_weight,
        quantity: i.quantity,
      };
    })
    .filter(Boolean);

  try {
    const { totalWeight, totalDeci } = calculatePalletPacking(packItems);
    return { totalWeight, totalDeci };
  } catch (err) {
    console.error('Pallet packing calculation failed for order items:', err.message);
    return { totalWeight: 0, totalDeci: 0 };
  }
}

// Shared by getOrders (paginated) and exportOrdersExcel (unpaginated) so the
// two can never drift apart on what a given filter set actually matches.
const buildOrderWhereConditions = ({ id, searchType, searchValue, status, dateFrom, dateTo }) => {
  const whereConditions = [];

  if(status) {
    if ( status === "Pending") {
      whereConditions.push({ orderstatusId : 1 });
    } else if (status === "In Progress") {
      whereConditions.push({ orderstatusId : 2 });
    } else if (status === "Completed") {
      whereConditions.push({ orderstatusId : 3 });
    } else if (status === "On Hold") {
       whereConditions.push({ orderstatusId : 4 });
    } else if (status === "Cancelled") {
      whereConditions.push({ orderstatusId : 5 });
    } else if (status === "Refunded") {
      whereConditions.push({ orderstatusId : 6 });
    }
  }

  if (id) {
    whereConditions.push({ id });
  }

  if (searchValue?.length > 0) {
    const searchField =
      searchType === "recipientname"
        ? { name: { [Op.iLike]: `%${searchValue}%` } }
        : searchType === "ordernumber"
        ? { orderNumber: { [Op.iLike]: `%${searchValue}%` } }
        : searchType === "email"
        ? { email: { [Op.iLike]: `%${searchValue}%` } }
        : searchType === "phone"
        ? { phone: { [Op.iLike]: `%${searchValue}%` } }
        : {
            name: { [Op.iLike]: `%${searchValue}%` },
          };

    whereConditions.push(searchField);
  }

  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range[Op.gte] = new Date(dateFrom);
    if (dateTo) {
      // inclusive of the whole "to" day
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      range[Op.lte] = end;
    }
    whereConditions.push({ createdAt: range });
  }

  return whereConditions;
};

const getOrders = async (data) => {
  const {
    id,
    limit,
    page,
    sorting,
    searchType,
    searchValue,
    status,
    dateFrom,
    dateTo
  } = data;

  const limitx = parseInt(limit);
  const offset = parseInt(page) * limitx;

  const order = sorting?.length
    // sorting arrives over a query string when called from the admin list's
    // clickable headers, so x.desc is the literal string "true"/"false" -
    // a plain truthy check would treat "false" as true.
    ? sorting.map((x) => [x.id, (x.desc === true || x.desc === 'true') ? "DESC" : "ASC"])
    : [["createdAt", "DESC"]];

  const whereConditions = buildOrderWhereConditions({ id, searchType, searchValue, status, dateFrom, dateTo });

  const result = await Order.findAndCountAll({
    limitx,
    offset,
    order,
    where: createAndWhere(whereConditions),
    distinct: true,
    attributes: [
      "id",
      "name",
      "orderNumber",
      "trackingNumber",
      "createdAt",
      "updatedAt",
      "closure",
      "firstline",
      "secondline",
      "email",
      "phone",
      "price",
      "city",
      "state",
      "zip",
      "extra_informations",
      "shipment_date",
      "shippingCharges",
      "user_note",
      "shipmentId",
      "invoiceId",
      "customer_id",
      "orderstatusId"
    ],
    include: [
      {
        model: OrderItem,
        attributes: [
          "id",
          "title",
          "code",
          "variant",
          "category",
          "price",
          "quantity",
          "note",
          "imgurl",
        ],
      },
      {
        model: Customer,
        attributes: ["id", "name", "surname"],
      },
      {
        model: OrderStatus,
        attributes: ["id", "name"],
      },
    ],
  });

  return result;
};

const STATUS_NAMES = { 1: 'Pending', 2: 'In Progress', 3: 'Completed', 4: 'On Hold', 5: 'Cancelled', 6: 'Refunded' };

// Same filters as getOrders (via the shared buildOrderWhereConditions), no
// pagination - exports everything currently matching what the admin has
// filtered the list to.
const exportOrdersExcel = async (filters) => {
  const whereConditions = buildOrderWhereConditions(filters || {});

  const orders = await Order.findAll({
    where: createAndWhere(whereConditions),
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'orderNumber', 'name', 'email', 'phone', 'price', 'createdAt', 'orderstatusId', 'trackingNumber'],
  });

  const rows = orders.map(o => ({
    'Sipariş No': o.orderNumber,
    'Alıcı': o.name || '',
    'E-posta': o.email || '',
    'Telefon': o.phone || '',
    'Durum': STATUS_NAMES[o.orderstatusId] || '',
    'Tutar': parseFloat(o.price) || 0,
    'Tarih': o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '',
    'Takip No': o.trackingNumber || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// Refunded/remaining amounts are never stored - always asked of Stripe
// fresh, same as refundOrder itself does, to avoid the amount_refunded-
// lives-on-the-Charge-not-the-PaymentIntent trap. Only meaningful for a
// real Stripe-paid order; manual orders (no stripePaymentIntentId) have no
// refund mechanism here, so they're left alone.
const attachRefundTotals = async (order) => {
  if (!order || !order.stripePaymentIntentId) return order;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    const refunds = await stripe.refunds.list({ payment_intent: order.stripePaymentIntentId, limit: 100 });
    const refundedCents = refunds.data.reduce((sum, r) => sum + r.amount, 0);
    order.dataValues.amountRefunded = refundedCents / 100;
    order.dataValues.amountRemaining = (paymentIntent.amount - refundedCents) / 100;
  } catch (err) {
    console.error(`Failed to fetch refund totals for order ${order.id}:`, err.message);
  }
  return order;
};

const getSingleOrder = async (id) => {
   const order = await Order.findOne({
    where: { id: id},
    include: [
      {
        model: OrderItem,
        attributes: [
          "id",
          "title",
          "code",
          "variant",
          "category",
          "price",
          "quantity",
          "note",
          "imgurl",
        ],
      },
      {
        model: Customer,
        attributes: [
          "id",
           "name",
           "surname",
           "email"
          ],
      },
      {
        model: Shipment,
        attributes: [
          "extra_informations",
          "totalPrice",
          "totalWeight",
          "totalDeci",
          "tracking",
        ],
        include: [{ model: Carrier, attributes: ["id", "name"] }],
      },
      {
        model: Billing,
      },
      {
        model: Transaction,
      },
      {
        model: OrderStatus,
      }
    ]
   })
   return attachRefundTotals(order)
}

const updateOrder = async (id, data) => {
 const { billingAddress, shippingAddress, adminNote} = data;

  // update or create billing address - billingAddress is optional, an order
  // may be edited (e.g. just the admin note) without touching billing at all
  if (billingAddress) {
    const { name, firstline, secondline, city, state, zip, phone, email } = billingAddress;

    if (billingAddress.id) {
      await Billing.update(billingAddress, { where: { id: billingAddress.id } });
    } else {
      const newBilling = await Billing.create({
        name, firstline, secondline, city, state, zip, phone, email
      });
      await Order.update({ billingId: newBilling.id }, { where: { id } });
    }
  }

 // Order update - shipping address
    await Order.update({...shippingAddress,extra_informations :{adminNote} }, { where: { id:id } });
}

const updateOrderStatus = async (data, actorUserId) => {

  const order = await Order.findOne({where: { id: data.orderId}})

  const oldStatusId = order.orderstatusId;
  const newStatusId = parseInt(data.orderStatusId)

  // "Cancelled" means no money was ever taken (or it's already been given
  // back) - a paid, not-yet-refunded order can't jump straight to Cancelled,
  // or the order record would silently disagree with what Stripe actually
  // charged. Refund it first (full or partial via refundOrder).
  if (newStatusId === CANCELLED_STATUS_ID && order.isPaid && order.orderstatusId !== REFUNDED_STATUS_ID) {
    throw new AppError('This order is paid. Refund it before marking it Cancelled.', 400);
  }

  order.orderstatusId = newStatusId

  await order.save();

  if (oldStatusId !== newStatusId) {
    await logOrderChange({
      orderId: order.id, actorUserId, action: 'status_change', field: 'orderstatusId', oldValue: oldStatusId, newValue: newStatusId,
    });
  }

 return order;

}

// Applies updateOrderStatus to many orders at once, never aborting the
// whole batch over one ineligible row (e.g. a paid order someone tried to
// mark Cancelled without refunding first) - reports it as skipped instead.
const bulkUpdateOrderStatus = async (orderIds, orderStatusId, actorUserId) => {
  const updated = [];
  const skipped = [];
  for (const orderId of orderIds || []) {
    try {
      await updateOrderStatus({ orderId, orderStatusId }, actorUserId);
      updated.push(orderId);
    } catch (error) {
      skipped.push({ id: orderId, reason: error.message || 'Update failed.' });
    }
  }
  return { updated, skipped };
};

const completeOrder = async (data, actorUserId) => {

  const order = await Order.findOne({where: { id: data.orderId}})

  // createOrder() always sets shipmentId at checkout time (a shipping-quote
  // Shipment, not a fulfillment one), so checking shipmentId here made this
  // a no-op for essentially every real order - only the status matters for
  // "has this order already been marked complete."
  if (order.orderstatusId === 3) {
      return;
  }

  // Update the SAME Shipment row createOrder() created at checkout time
  // (order.shipmentId is always set by then) instead of creating a second
  // one and repointing order.shipmentId at it - that used to silently
  // orphan the original row (with its real deci/weight/address quote data)
  // the moment an order was fulfilled.
  let shipment = order.shipmentId ? await Shipment.findByPk(order.shipmentId) : null;
  if (!shipment) {
    shipment = await Shipment.create({
           name: order.name || "",
           firstline: order.firstline || "",
           secondline: order.secondline || "",
           email: order.email || "",
           phone: order.phone || "",
           city: order.city || "",
           state: order.state || "",
           zip: order.zip,
    });
  }
  shipment.carrierId = data.carrierId;
  shipment.tracking = data.trackingNumber;
  shipment.userId = order.userId;
  if (data.shipmentstatusId != null) {
    shipment.shipmentstatusId = data.shipmentstatusId;
  }
  await shipment.save();

  const oldStatusId = order.orderstatusId;
  order.trackingNumber = data.trackingNumber;
  order.shipmentId = shipment.id;
  order.orderstatusId = 3;
  await order.save();

  await logOrderChange({
    orderId: order.id, actorUserId, action: 'status_change', field: 'orderstatusId', oldValue: oldStatusId, newValue: 3,
  });

}

// Refunds the order's most recent successful payment via Stripe, using the
// real PaymentIntent id recorded on the (correctly-linked, since Phase 0)
// Transaction row - not something an admin can fake by just picking
// "Refunded" from the status dropdown, which used to be all that action did.
// `amount` (dollars, optional) does a partial refund - a partial refund
// never flips the order to Refunded on its own, since the order isn't
// necessarily cancelled (e.g. refunding for one damaged item on an
// otherwise-fulfilled order). Only once Stripe's own cumulative
// amount_refunded reaches the full charged amount does status flip.
const refundOrder = async (orderId, actorUserId, amount) => {
  const order = await Order.findOne({ where: { id: orderId } });
  if (!order) throw new AppError('Order not found.', 404);
  if (!order.isPaid) throw new AppError('Order is not paid - nothing to refund.', 400);
  if (order.orderstatusId === REFUNDED_STATUS_ID) throw new AppError('Order has already been refunded.', 400);

  const transaction = await Transaction.findOne({ where: { orderId: order.id }, order: [['id', 'DESC']] });
  if (!transaction || !transaction.payment_id) {
    throw new AppError('No payment record found for this order - cannot refund.', 400);
  }

  const refundParams = { payment_intent: transaction.payment_id };
  const amountCents = amount != null ? Math.round(Number(amount) * 100) : null;
  if (amountCents != null) {
    if (!(amountCents > 0)) throw new AppError('Refund amount must be greater than zero.', 400);
    refundParams.amount = amountCents;
  }

  const refund = await stripe.refunds.create(refundParams);

  // amount_refunded lives on the Charge, not the PaymentIntent - sum every
  // refund issued against this PaymentIntent instead of trusting a single
  // field that doesn't exist on this object.
  const paymentIntent = await stripe.paymentIntents.retrieve(transaction.payment_id);
  const refundsList = await stripe.refunds.list({ payment_intent: transaction.payment_id, limit: 100 });
  const totalRefundedCents = refundsList.data.reduce((sum, r) => sum + r.amount, 0);
  const isFullyRefunded = totalRefundedCents >= paymentIntent.amount;

  const oldStatusId = order.orderstatusId;
  if (isFullyRefunded) {
    order.orderstatusId = REFUNDED_STATUS_ID;
    await order.save();
  }

  await logOrderChange({
    orderId: order.id, actorUserId, action: 'refund', field: null, oldValue: transaction.payment_id,
    newValue: `${refund.id} ($${(refund.amount / 100).toFixed(2)})`,
  });
  if (isFullyRefunded) {
    await logOrderChange({
      orderId: order.id, actorUserId, action: 'status_change', field: 'orderstatusId', oldValue: oldStatusId, newValue: REFUNDED_STATUS_ID,
    });
  }

  return { order, refund, isFullyRefunded, amountRefunded: totalRefundedCents / 100, amountTotal: paymentIntent.amount / 100 };
};

// Corrects an order's line items after the fact (wrong quantity, added/
// removed a product, etc.) - `items` is the admin's full desired list, not
// a delta. Recomputes and stores the new Order.price, but never touches
// Stripe: any balance owed or to give back is a manual staff decision
// (via refundOrder, now partial-capable, or handled outside the system).
const updateOrderItems = async (orderId, items, actorUserId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new AppError('Order not found.', 404);
  if (!Array.isArray(items)) throw new AppError('items must be an array.', 400);

  const existing = await OrderItem.findAll({ where: { orderId } });
  const keepIds = new Set(items.filter(i => i.id).map(i => Number(i.id)));

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await row.destroy(); // soft delete - OrderItem is paranoid: true
    }
  }

  const survivors = [];
  for (const item of items) {
    const quantity = parseInt(item.quantity, 10) || 0;
    const price = parseFloat(item.price) || 0;
    if (item.id) {
      const row = existing.find(r => r.id === Number(item.id));
      if (!row) continue;
      row.quantity = quantity;
      row.price = price;
      if (item.title != null) row.title = item.title;
      await row.save();
      survivors.push(row);
    } else {
      let variant = null;
      if (item.variantId) {
        variant = await Variant.findOne({ where: { id: item.variantId }, include: [{ model: VariantImages, include: [{ model: Image }] }] });
      }
      const imageUrl = variant?.variant_images?.length > 0 ? variant.variant_images[0]?.url : null;
      const created = await OrderItem.create({
        title: item.title || variant?.title || '',
        code: variant?.stock || item.code || '',
        price,
        quantity,
        orderId,
        imgurl: imageUrl,
        variant_id: item.variantId || null,
      });
      survivors.push(created);
    }
  }

  const newTotal = survivors.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0) + (parseFloat(order.shippingCharges) || 0);
  const oldPrice = order.price;
  order.price = newTotal;
  await order.save();

  await logOrderChange({
    orderId: order.id, actorUserId, action: 'items_edit', field: 'price', oldValue: oldPrice, newValue: newTotal,
  });

  return { order, items: survivors };
};

// Shared by createOrder (right after placing) and resendOrderConfirmation
// (on-demand, e.g. "I never got my confirmation email") so the two can
// never drift into sending different-looking emails for the same order.
const sendOrderConfirmationEmail = async (order, orderItemsList, billingName, shippingTotalPrice) => {
  const itemsx = orderItemsList.map(item => ({
    title: item.title,
    code: item.code,
    price: item.price,
    quantity: item.quantity,
    imgurl: item.imgurl
  }));

  await sendEmail({
    email: order.email,
    subject: "ESK Packaging - Order Success",
    username: billingName || "Customer",
    orderNumber: order.orderNumber,
    subtotal: order.price || 0,
    items: itemsx,
    price: String(parseFloat(order.price) + parseFloat(shippingTotalPrice || 0) || 0),
    shipping: shippingTotalPrice || 0,
    message: "Your order has been placed.",
  });
};

const resendOrderConfirmation = async (orderId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new AppError('Order not found.', 404);

  const items = await OrderItem.findAll({ where: { orderId } });
  const billing = order.billingId ? await Billing.findByPk(order.billingId) : null;
  const shipment = order.shipmentId ? await Shipment.findByPk(order.shipmentId) : null;

  await sendOrderConfirmationEmail(order, items, billing?.name, shipment?.totalPrice ?? order.shippingCharges);
  return { sent: true };
};

const createOrder = async (data) => {
  const { userInfo, order } = data;

  const{ billing, items, recipient, shipping, paymentIntent}= order;

  // Without a real PaymentIntent id there is no way for the webhook to ever
  // reconcile/confirm this order later - refuse rather than create an order
  // that can never be marked paid.
  if (!paymentIntent?.id) {
    throw new AppError('Missing payment confirmation.', 400);
  }

  // Normalize payment amount from Stripe (amount in cents) to dollars
  const amountCents = Number(paymentIntent.amount) || 0;
  const amount = amountCents / 100;

  let foundUser;
  let myCustomer;
  // collect created order items here so we can pass the full array to the email template
  let orderItems = [];

  if (userInfo) {
    // Find existing user (Login)
    foundUser = await User.findOne({ where: { id: userInfo.id } });
    console.log("logged in user:", foundUser);
  } else {
    // Find existing user (Guest)
    let checkUser = await User.findOne({ where: { email: billing.email } });
   
    // Register new user (Guest)
    if (!checkUser) {
      foundUser = await User.create({
        name: billing.firstname,
        surname: billing.lastname,
        password: "",
        email: billing.email,
        isActive: true,
      });
      console.log("created user:", foundUser);
    } else {
        foundUser = await User.findOne({ where: { email: billing.email } });
    }
  }

  //find or create the customer - prefer the userId match (every account
  // gets a Customer row at registration now, see ensureCustomerForUser),
  // falling back to email for rows created before that existed.
  let checkCustomer = await Customer.findOne({ where: { userId: foundUser.id } });
  if (!checkCustomer) {
    checkCustomer = await Customer.findOne({ where: { email: billing.email } });
  }

  if (checkCustomer) {
    myCustomer = checkCustomer;
  } else {
    myCustomer = await Customer.create({
      name: billing.firstname || "" + " " + billing.lastname || "",
      email: billing.email || "",
      phone: billing.phone || "",
      userId: foundUser.id
    });
  }

  // Transaction creation moved to confirmOrderPayment() (called from the
  // Stripe webhook) - it's the only place we know for certain a payment was
  // actually confirmed by Stripe, not just claimed by the client.

  // Resolve the same discount (explicit code or an auto-applied first-order
  // code) that create-payment-intent already used to compute the Stripe
  // charge - purely to record which code applied and by how much; the
  // charged/stored total itself still comes from the confirmed PaymentIntent
  // amount below, not from this recomputation.
  const { appliedDiscountCode, discountAmount } = await resolveOrderPricing({
    items,
    user: foundUser,
    discountCode: order.discountCode,
    models,
  });

  //CREATE BILLING

  const newBilling = await Billing.create({
        name: billing.firstname || " " + billing.lastname || " ",
        firstline: billing.firstline || "",
        secondline: billing.secondline || "",
        phone: billing.phone || "",
        city: billing.city || "",
        state: billing.state || "",
        zip: billing.zip ||  "",
        extra_informations : { email: billing.email || "" }
      })

  
 const [carr] = await Carrier.findOrCreate({ where: { name: shipping.carrier || "" } });

  const { totalWeight, totalDeci } = await resolvePalletTotalsFromOrderItems(items);

  //CREATE SHIPPING
  const newShipping = await Shipment.create({
    name: recipient.name || "",
    address: recipient.address || "",
    firstline: recipient.firstline || "",
    secondline: recipient.secondline || "",
    email: recipient.email || "",
    phone: recipient.phone || "",
    city: recipient.city || "",
    state: recipient.state || "",
    zip: recipient.zip || "",
    totalDeci,
    totalWeight,
    totalPrice: shipping.price || 0,
    carrierId: carr.id,
    userId: foundUser.id
    })

  // En son orderNumber'ı bul
  const lastOrder = await Order.findOne({
    order: [["id", "DESC"]],
  });

  // Başlangıç değeri
  let nextOrderNumber = 100001;

  if (lastOrder && lastOrder.orderNumber) {
    // string olduğu için önce int'e çevir
    const lastNumber = parseInt(lastOrder.orderNumber, 10);
    if (!isNaN(lastNumber)) {
      nextOrderNumber = lastNumber + 1;
    }
  }

  // CREATE ORDER

  const newOrder = await Order.create({
    name: recipient.name || "",
    address: recipient.address || "",
    firstline: recipient.firstline || "",
    secondline: recipient.secondline || "",
    email: recipient.email || "",
    phone: recipient.phone || "",
    city: recipient.city || "",
    state: recipient.state || "",
    zip: recipient.zip || "",
    shippingCharges: shipping.price,
    shipmentId: newShipping.id,
    billingId:  newBilling.id,
  // store price in dollars
  price: amount,
    // Only the Stripe webhook (confirmOrderPayment, once it verifies the
    // charge actually succeeded) is allowed to flip this to true.
    isPaid: false,
    stripePaymentIntentId: paymentIntent.id,
    discountCodeId: appliedDiscountCode ? appliedDiscountCode.id : null,
    discountAmount: appliedDiscountCode ? discountAmount : null,
    closure: "open",
    userId: foundUser.id,
    orderstatusId: 1,
    customerId: myCustomer.id,
    uniqueId: generateCustomUniqueId(),
    orderNumber: nextOrderNumber.toString(),
  });

  //Orderitems create

  for (let i = 0; i < items.length; i++) {
    const element = items[i];

    let variant = await Variant.findOne({ where: {id: element.id}, include: [{model:VariantImages,include: [{model: Image}]}]})

    let imageUrl = variant.variant_images && variant.variant_images.length > 0 ? variant.variant_images[0]?.url : null

    // Server-computed price (per-customer override / discount, or the
    // tiered price) is the source of truth for the stored record. OrderItem
    // .price is a LINE TOTAL (unit price * quantity) - matches what the FE's
    // calculatePrice() has always sent, not a per-unit price - so the
    // resolver's per-unit result is multiplied by quantity before comparing/
    // storing. Client-submitted element.price is only compared against it
    // for a mismatch warning - by this point in checkout the Stripe charge
    // has typically already been captured using the client's number (see
    // utils/pricing.js and the PR notes for why the actual charge amount
    // isn't touched here).
    const resolvedUnitPrice = await resolveVariantPrice(variant, element.quantity, foundUser);
    const resolvedTotal = resolvedUnitPrice != null ? resolvedUnitPrice * element.quantity : null;
    if (resolvedTotal != null && Number(resolvedTotal).toFixed(2) !== Number(element.price).toFixed(2)) {
      console.warn(
        `Order price mismatch: variant ${variant.id}, user ${foundUser?.id ?? 'guest'} - client sent ${element.price}, server resolved ${resolvedTotal}`
      );
    }
    const finalPrice = resolvedTotal != null ? resolvedTotal : element.price;

  const createdItem = await OrderItem.create({
      title: variant.title,
      code: variant.stock,
      price: finalPrice,
      quantity: element.quantity,
      orderId: newOrder.id,
      imgurl: imageUrl,
      // The Sequelize association uses this exact string as the JS
      // attribute name (Variant.hasMany(OrderItem, {foreignKey:
      // 'variant_id'})) - "variantId" would silently be dropped.
      variant_id: element.id
    });
  orderItems.push(createdItem);
  }

  if (appliedDiscountCode) {
    await DiscountCode.increment('timesUsed', { by: 1, where: { id: appliedDiscountCode.id } });
    await DiscountCodeRedemption.create({
      discountCodeId: appliedDiscountCode.id,
      userId: foundUser.id,
      orderId: newOrder.id,
    });
  }

  // Send order success email
  await sendOrderConfirmationEmail(newOrder, orderItems, newBilling.name, newShipping.totalPrice);

  // After everything is complete, clear the user's cart (set productArray to empty list)
  try {
    // foundUser should be the user who placed the order
    if (foundUser && foundUser.id) {
      // Some setups store a cartId on the user (User.belongsTo(Cart)). Use that if available.
      const cartId = foundUser.cartId || (await User.findByPk(foundUser.id)).cartId;
      if (cartId) {
        await Cart.update({ productArray: [] }, { where: { id: cartId } });
      }
    }
  } catch (err) {
    console.error('Failed to clear cart for user', foundUser && foundUser.id, err);
  }

  return "Order created successfully!"

};

// For phone/email orders paid outside Stripe (wire, check, etc.) - skips
// the PaymentIntent/webhook path entirely (stripePaymentIntentId stays
// null, so confirmOrderPayment can never touch this row). isPaid/a payment
// note are taken directly from the admin instead of being verified by
// Stripe - that verification only exists for the real checkout flow.
const createManualOrder = async (data, actorUserId) => {
  const { customerId, newCustomer, recipient, billing, shipping, items, isPaid, paymentNote } = data;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one item is required.', 400);
  }

  let myCustomer;
  let foundUser = null;
  if (customerId) {
    myCustomer = await Customer.findByPk(customerId);
    if (!myCustomer) throw new AppError('Customer not found.', 404);
    if (myCustomer.userId) foundUser = await User.findByPk(myCustomer.userId);
  } else if (newCustomer?.email) {
    foundUser = await User.findOne({ where: { email: newCustomer.email } });
    if (!foundUser) {
      foundUser = await User.create({
        name: newCustomer.name || '',
        surname: newCustomer.surname || '',
        email: newCustomer.email,
        phone: newCustomer.phone || '',
        password: '',
        isActive: true,
      });
    }
    myCustomer = await ensureCustomerForUser(foundUser);
  } else {
    throw new AppError('A customer must be selected, or a new customer name/email provided.', 400);
  }

  const newBilling = await Billing.create({
    name: billing?.firstname || myCustomer.name || '',
    firstline: billing?.firstline || '',
    secondline: billing?.secondline || '',
    phone: billing?.phone || myCustomer.phone || '',
    city: billing?.city || '',
    state: billing?.state || '',
    zip: billing?.zip || '',
    extra_informations: { email: billing?.email || myCustomer.email || '' },
  });

  const [carr] = await Carrier.findOrCreate({ where: { name: shipping?.carrier || '' } });

  const { totalWeight, totalDeci } = await resolvePalletTotalsFromOrderItems(
    items.map((it) => ({ id: it.variantId, quantity: it.quantity }))
  );

  const newShipping = await Shipment.create({
    name: recipient?.name || myCustomer.name || '',
    firstline: recipient?.firstline || '',
    secondline: recipient?.secondline || '',
    email: recipient?.email || myCustomer.email || '',
    phone: recipient?.phone || '',
    city: recipient?.city || '',
    state: recipient?.state || '',
    zip: recipient?.zip || '',
    totalDeci,
    totalWeight,
    totalPrice: shipping?.price || 0,
    carrierId: carr.id,
    userId: foundUser?.id || null,
  });

  const lastOrder = await Order.findOne({ order: [['id', 'DESC']] });
  let nextOrderNumber = 100001;
  if (lastOrder && lastOrder.orderNumber) {
    const lastNumber = parseInt(lastOrder.orderNumber, 10);
    if (!isNaN(lastNumber)) nextOrderNumber = lastNumber + 1;
  }

  let itemsTotal = 0;
  const itemRows = [];
  for (const item of items) {
    const quantity = parseInt(item.quantity, 10) || 1;
    const price = parseFloat(item.price) || 0;
    let variant = null;
    if (item.variantId) {
      variant = await Variant.findOne({ where: { id: item.variantId }, include: [{ model: VariantImages, include: [{ model: Image }] }] });
    }
    const imageUrl = variant?.variant_images?.length > 0 ? variant.variant_images[0]?.url : null;
    itemRows.push({
      title: item.title || variant?.title || '',
      code: variant?.stock || item.code || '',
      price,
      quantity,
      imgurl: imageUrl,
      variant_id: item.variantId || null,
    });
    itemsTotal += price;
  }
  const shippingPrice = parseFloat(shipping?.price) || 0;
  const totalPrice = itemsTotal + shippingPrice;

  const newOrder = await Order.create({
    name: recipient?.name || myCustomer.name || '',
    firstline: recipient?.firstline || '',
    secondline: recipient?.secondline || '',
    email: recipient?.email || myCustomer.email || '',
    phone: recipient?.phone || '',
    city: recipient?.city || '',
    state: recipient?.state || '',
    zip: recipient?.zip || '',
    shippingCharges: shippingPrice,
    shipmentId: newShipping.id,
    billingId: newBilling.id,
    price: totalPrice,
    isPaid: Boolean(isPaid),
    stripePaymentIntentId: null,
    closure: 'open',
    userId: foundUser?.id || null,
    orderstatusId: 1,
    customerId: myCustomer.id,
    uniqueId: generateCustomUniqueId(),
    orderNumber: nextOrderNumber.toString(),
    extra_informations: paymentNote ? { adminNote: paymentNote } : null,
  });

  const orderItems = [];
  for (const row of itemRows) {
    orderItems.push(await OrderItem.create({ ...row, orderId: newOrder.id }));
  }

  // confirmOrderPayment (the Stripe webhook) is the only other place an
  // Invoice gets created - manual orders never go through it, so a paid
  // manual order used to get no Invoice at all even though it's a real,
  // completed sale just as much as a card order.
  if (isPaid) {
    const now = new Date().toISOString();
    const invoice = await Invoice.create({
      userId: newOrder.userId,
      documentNumber: `INV-${newOrder.orderNumber}`,
      issueDate: now,
      paymentDate: now,
      grandTotal: newOrder.price,
      grandTotalInclVat: newOrder.price,
      paymentTotal: newOrder.price,
      paymentType: 'manual',
      paymentPlatform: 'manual',
      description: `Invoice for Order #${newOrder.orderNumber}`,
    });
    newOrder.invoiceId = invoice.id;
    await newOrder.save();
  }

  await logOrderChange({
    orderId: newOrder.id, actorUserId, action: 'manual_create', field: null, oldValue: null,
    newValue: `Manual order, isPaid=${Boolean(isPaid)}${paymentNote ? `, note: ${paymentNote}` : ''}`,
  });

  return newOrder;
};

// Called only from the Stripe webhook handler once Stripe itself confirms a
// payment_intent.succeeded event - this is the one place an Order actually
// gets marked paid, and the one place a real Transaction row gets created.
// Idempotent: webhooks can and do redeliver the same event.
const confirmOrderPayment = async (stripePaymentIntent) => {
  const order = await Order.findOne({ where: { stripePaymentIntentId: stripePaymentIntent.id } });
  if (!order) {
    console.warn(`Webhook: no order found for PaymentIntent ${stripePaymentIntent.id}`);
    return;
  }
  if (order.isPaid) {
    return; // already confirmed - duplicate webhook delivery
  }

  order.isPaid = true;
  await order.save();

  await Transaction.create({
    payment_id: stripePaymentIntent.id,
    customer_id: order.customerId != null ? String(order.customerId) : null,
    amount: (Number(stripePaymentIntent.amount) || 0) / 100,
    currency: stripePaymentIntent.currency || '',
    status: stripePaymentIntent.status || '',
    payment_method: stripePaymentIntent.payment_method || '',
    orderId: order.id,
  });

  // The Invoice model exists but nothing ever created a row - do it here,
  // the one place we know for certain payment actually went through.
  const now = new Date().toISOString();
  const invoice = await Invoice.create({
    userId: order.userId,
    documentNumber: `INV-${order.orderNumber}`,
    issueDate: now,
    paymentDate: now,
    grandTotal: order.price,
    grandTotalInclVat: order.price,
    paymentTotal: order.price,
    paymentType: 'card',
    paymentPlatform: 'stripe',
    description: `Invoice for Order #${order.orderNumber}`,
  });
  order.invoiceId = invoice.id;
  await order.save();
};

module.exports = {
    getOrders,
    createOrder,
    createManualOrder,
    confirmOrderPayment,
    getSingleOrder,
    updateOrder,
    updateOrderItems,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    completeOrder,
    refundOrder,
    resendOrderConfirmation,
    exportOrdersExcel,
}