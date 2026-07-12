const AppError = require('../utils/appError')
const  { Variant, Subcategory, Category}  = require('../db/models');
const { Op } = require('sequelize');
const { createAndWhere } = require('./scopes');

const searchBarFunc = async (data) => {

    const {
    searchValue,
  } = data;

  const limitx = 10;
  const offset = 0;

  const order = [["createdAt", "ASC"]];

  const whereConditions = [];

  if (searchValue?.length > 0) {
      const searchField = { title: { [Op.iLike]: `%${searchValue}%` } }
  
      whereConditions.push(searchField);
    }

    const result = await Variant.findAndCountAll({
    limitx,
    offset,
    order,
    where: createAndWhere(whereConditions),
    attributes: [
      "id",
      "title",
      "stock"
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