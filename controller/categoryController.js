const { Op } = require('sequelize')
const {Category, Subcategory, Product, SubcategoryImages, Image, ProductImages } = require('../db/models')
const Variant = require('../db/models/variant')
const { getTree } = require('./catalogNodeController')
const { toLegacyCategoryShape } = require('./catalogNodeTree')

// Compatibility shim: ESK_FE_V2 calls GET /category directly and still
// expects this exact legacy shape. The real data now lives in catalog_node
// (see docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md);
// this reshapes it back. Only works for trees up to 3 levels deep - a node
// nested deeper than Category -> Subcategory -> Product has no slot here
// and is simply omitted (toLegacyCategoryShape's own documented behavior).
const getCategories = async () => {
  const tree = await getTree()
  return toLegacyCategoryShape(tree)
}



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