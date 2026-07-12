const { Op } = require('sequelize')
const {Category, Subcategory, Product, SubcategoryImages, Image, ProductImages } = require('../db/models')
const Variant = require('../db/models/variant')

const getCategories = async () => {
  return await Category.findAll({
    attributes: ["id", "name"],
    include: [
      {
        model: Subcategory,
        include: [
          {
            model: SubcategoryImages,
            include: [{ model: Image }],
          },
          {
            model: Product,
            include: [
              {
                model: Variant,
                as: "variants",
                where: {},
                required: false,
              },
              {
                model: ProductImages,
                include: [ {model: Image}]
               }
            ],
          },
          {
            model: Variant,
            as: "variants",
            where: {
              productId: null,
            },
            required: false,
          },
        ],
      },
      {
        model: Variant,
        as: "variants",
        where: {
          subcategory_id: null,
          product_id: null,
        },
        required: false,
      },
    ],
  });
};



const getCategory = async (id) => {
	return await Category.findOne({where: { id: id}})
}

const getCategoryByName = async (name) => {
	return await Category.findOne({ where: { name } })
}

const addCategory = async (param) => {
	return await Category.create({ ...param })
}

const deleteCategory = async (id) => {
	
	let subCategories = await Subcategory.findAll({ where: {categoryId: id}, raw: true})
	let subcategoryIds = subCategories.map(x=> x.id)
	
	if ( subCategories && subCategories.length > 0) {
		for (let i = 0; i < subCategories.length; i++) {
			const subcategory = subCategories[i];
		
			//find all products for sub-products
			let products = await Product.findAll({ where: { subcategoryId: subcategory.id}, raw: true})
		
			if( products && products.length > 0) {
				let productIds = products.map(x=> x.id)
				
				//delete product variants
				await Variant.destroy({where: {  productId : { [Op.in]:productIds } }})
				
			}
		}
		//delete subcategory variants
		await Variant.destroy({where: { subcategoryId : { [Op.in]:subcategoryIds } }})
		await Product.destroy({where: { subcategoryId : { [Op.in]:subcategoryIds } }})
		
	}
	
	//delete category varints and categories
	
	await Variant.destroy({where: { categoryId: id }})
	
	await Category.destroy({ where: {id: id}})
	
	return "Category deleted successfully!"
}

module.exports = {
	getCategories,
	getCategoryByName,
	addCategory,
	getCategory,
	deleteCategory
}