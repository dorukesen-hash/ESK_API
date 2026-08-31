const models = require('../db/models')
const { Order, OrderItem, Customer, Shipment, OrderStatus, User, Cart, Invoice, Transaction, Variant, VariantImages, Image, Carrier, DiscountCode, DiscountCodeRedemption } = models
const { Op } = require('sequelize')
const { createAndWhere } = require('./scopes');
const Billing = require('../db/models/billing');
const sendEmail = require('../utils/sendEmail');
const AppError = require('../utils/appError');
const { resolveVariantPrice, resolveOrderPricing } = require('../utils/pricing');

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


const getOrders = async (data) => {
  const {
    id,
    limit,
    page,
    sorting,
    searchType,
    searchValue,
    status
  } = data;
 
  const limitx = parseInt(limit);
  const offset = parseInt(page) * limitx;

  const order = sorting?.length
    ? sorting.map((x) => [x.id, x.desc ? "DESC" : "ASC"])
    : [["createdAt", "DESC"]];

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
        : {
            name: { [Op.iLike]: `%${searchValue}%` },
          };

    whereConditions.push(searchField);
  }

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



const getSingleOrder = async (id) => {
   return await Order.findOne({
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
          "extra_informations"
          ],
      },
      {
        model: Billing,
      }
    ]
   })
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

const updateOrderStatus = async ( data) => {

  const order = await Order.findOne({where: { id: data.orderId}})

  order.orderstatusId = parseInt(data.orderStatusId)

  await order.save();

 return order;

}

const completeOrder = async (data) => {

  const order = await Order.findOne({where: { id: data.orderId}})

  // createOrder() always sets shipmentId at checkout time (a shipping-quote
  // Shipment, not a fulfillment one), so checking shipmentId here made this
  // a no-op for essentially every real order - only the status matters for
  // "has this order already been marked complete."
  if (order.orderstatusId === 3) {
      return;
  }

  const shipment = await Shipment.create({
         name: order.name || "",
         firstline: order.firstline || "",
         secondline: order.secondline || "",
         email: order.email || "",
         phone: order.phone || "",
         city: order.city || "",
         state: order.state || "",
         zip: order.zip,
         carrierId: data.carrierId,
         tracking: data.trackingNumber
   })

  order.trackingNumber = data.trackingNumber;
  order.shipmentId = shipment.id;
  order.orderstatusId = 3;
  await order.save();

}


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

  //find or create the customer
  let checkCustomer = await Customer.findOne({
    where: { email: billing.email },
  });

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
    totalDeci : shipping.totalDeci || 0,
    totalWeight: shipping.totalWeight || 0,
    totalPrice: shipping.price || 0,
    carrierId: carr.id
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

  let itemsx = orderItems.map(item => ({
    title: item.title,
    code: item.code,
    price: item.price,
    quantity: item.quantity,
    imgurl: item.imgurl
  }));

  // Send order success email
  await sendEmail({
      email: newOrder.email,
      subject:"ESK Packaging - Order Success",
      username: newBilling.name || "Customer",
      orderNumber: newOrder.orderNumber,
      subtotal: newOrder.price || 0,
      items: itemsx,
      price: String( parseFloat(newOrder.price) + parseFloat(newShipping.totalPrice || 0) || 0),
      shipping: newShipping.totalPrice || 0,
      message: "Your order has been placed."
    })

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
};

module.exports = {
    getOrders,
    createOrder,
    confirmOrderPayment,
    getSingleOrder,
    updateOrder,
    updateOrderStatus,
    completeOrder
}