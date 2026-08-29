const { Op } = require('sequelize');
const { Customer, Cart } = require('../db/models');
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

module.exports = {
    getCustomers,
    getCustomerByName,
    addCustomer,
}