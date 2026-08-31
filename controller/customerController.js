const { Op } = require('sequelize');
const { Customer, Cart, User, ShippingProfiles, Order, SpecialPrices, Variant } = require('../db/models');
const { createAndWhere } = require('./scopes');

const getCustomers = async (data) => {
  const { limit, page, globalFilter, sorting } = data;
  const limitx = parseInt(limit ? limit : 10);
  const offset = parseInt(page ? page : 0) * limit;

  const order =
  !sorting || sorting.length < 1
    ? [["createdAt", "ASC"]]
    : [...sorting.map((x) => [x.id, x.desc === true ? "DESC" : "ASC"])];

  const opt = [];

  if (globalFilter && globalFilter !== "") {
    const term = decodeURIComponent(globalFilter);
    opt.push({
      [Op.or]: [
        { name: { [Op.iLike]: `%${term}%` } },
        { email: { [Op.iLike]: `%${term}%` } },
        { phone: { [Op.iLike]: `%${term}%` } },
      ],
    });
  }

  return await Customer.findAndCountAll({
    limit: limitx,
    offset: offset,
    where: createAndWhere(opt),
    distinct: false,
    order: order
  });
};

const getCustomerByName = async (name) => {
    return await Customer.findOne({ where: { name } })
}

const addCustomer = async (param) => {
    return await Customer.create({ ...param })
}

// Full detail view for the admin "Customer accounts" tab - the Customer row
// (order-linked contact snapshot) plus its login User row, address book, order
// history, and any per-variant price overrides. Kept as one query group here
// (not scattered across each section's own hook) since a detail page needs
// all of it at once.
const getCustomerDetailForAdmin = async (id) => {
    const customer = await Customer.findByPk(id, {
        include: [
            {
                model: User,
                attributes: ['id', 'name', 'surname', 'email', 'phone', 'isActive', 'discountPercent', 'createdAt'],
            },
        ],
    });
    if (!customer) return null;

    const userId = customer.userId;

    const [shippingProfiles, orders, specialPrices] = await Promise.all([
        userId ? ShippingProfiles.findAll({ where: { userId } }) : [],
        Order.findAll({
            where: { customerId: id },
            attributes: ['id', 'orderNumber', 'price', 'createdAt', 'orderstatusId'],
            order: [['createdAt', 'DESC']],
        }),
        userId
            ? SpecialPrices.findAll({
                  where: { userId },
                  include: [{ model: Variant, attributes: ['id', 'title', 'stock'] }],
                  order: [['id', 'ASC']],
              })
            : [],
    ]);

    return { customer, shippingProfiles, orders, specialPrices };
};

module.exports = {
    getCustomers,
    getCustomerByName,
    addCustomer,
    getCustomerDetailForAdmin,
}