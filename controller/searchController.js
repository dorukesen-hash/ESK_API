const AppError = require('../utils/appError')
const  { Variant, Subcategory, Category}  = require('../db/models');
const { Op } = require('sequelize');
const { createAndWhere } = require('./scopes');

const searchBarFunc = async (data) => {

    const {
    searchValue,
    limit,
    page,
    categoryId,
    subcategoryId,
  } = data;

  const limitx = parseInt(limit ? limit : 10);
  const offset = parseInt(page ? page : 0) * limitx;

  const order = [["createdAt", "ASC"]];

  const whereConditions = [];

  if (searchValue?.length > 0) {
      const searchField = { title: { [Op.iLike]: `%${searchValue}%` } }

      whereConditions.push(searchField);
    }

  if (subcategoryId) {
    whereConditions.push({ subcategoryId: parseInt(subcategoryId) });
  } else if (categoryId) {
    whereConditions.push({ categoryId: parseInt(categoryId) });
  }

    const result = await Variant.findAndCountAll({
    limit: limitx,
    offset,
    order,
    where: createAndWhere(whereConditions),
    attributes: [
      "id",
      "title",
      "sku"
    ],
    include: [
        {
          model: Subcategory
        },
        {
          model: Category
        },
      ]
    })

    return result;
}


module.exports = {
	searchBarFunc
}