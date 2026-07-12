const { Op } = require('sequelize')
const { Product, Subcategory, Category, ProductImages, Image, Spesification, Price, PackageInfo, PalletInfo} = require('../db/models')
const Variant = require('../db/models/variant')
const Description = require("../db/models/description");
const Dimension = require('../db/models/dimensions');

const getProducts = async () => {
	return await Product.findAll()
}

const getProductDetails = async (productId) => {
  const data = await Product.findOne({
    where: { id: productId },
    include: [
      { model: Description, as: "desc1" },
      {
        model: ProductImages,
        include: [
          {
            model: Image,
            attributes: ["id", "url"],
          },
        ],
      },
      {
        model: Variant,
        include: [
          { model: Description, as: "desc3" },
          { model: Spesification, as: "spesification" },
          { model: Price },
          { model: Dimension, as: "dim3" },
          { model: PackageInfo, as: "package_info" },
          { model: PalletInfo, as: "pallet_info" },
        ],
      },
    ],
  });

  return data;
};



const getProductsforSubCategory = async (id) => {
	return await Product.findAll({
		where: { subcategoryId: parseInt(id)},
		attributes:[
			'id',
			'title',
			'description',
			'extradata',
			'imgurl'
		],
		include: [
			{model: Category, as: 'category', attributes: ['id','name']},
			{model: Subcategory, as: 'subcategory', attributes: ['id','name']},
			{model: Variant, as: 'variants'}
		]
	})
}

const getProductsFromSubCategoryName = async (name) => {

	let query;
	if(name.includes("%20")) {
		query = name.replace(/%20/g, " ")
	}else {
		query = name
	}
  
	const subCategory = await Subcategory.findOne({
			where:{ name: { [Op.like]: `%${query}%` } },
			raw: true
		})

	return await Product.findAll({
		where: { subcategoryId: subCategory.id }
	})
}

const getProduct = async (id) => {
	return await Product.findByPk(id)
}


const saveProduct = async (param) => {
	return await Product.create({ ...param })
}

const editProduct = async (param) => {
	return await Product.create({ ...param })
}


const deleteProduct = async (id) => {
	return await Product.destroy({where:{id : id}})
}



module.exports = {
	getProducts,
	getProduct,
	saveProduct,
	editProduct,
	deleteProduct,
	getProductsforSubCategory,
	getProductsFromSubCategoryName,
	getProductDetails
}