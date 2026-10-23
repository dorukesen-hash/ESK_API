const { Op } = require('sequelize')
const {Category, Subcategory, Product, SubcategoryImages, Image, ProductImages } = require('../db/models')
const Variant = require('../db/models/variant')
const { getFullTree } = require('./catalogNodeController')
const { toLegacyCategoryShape } = require('./catalogNodeTree')

// Pre-migration implementation, kept only as getCategories' fallback below -
// not for any other caller. Queries the original Category/Subcategory/
// Product tables directly, exactly as this function did before the
// catalog_node migration (see
// docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md).
const getCategoriesLegacy = async () => {
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

// Compatibility shim: ESK_FE_V2 calls GET /category directly and still
// expects this exact legacy shape. The real data now lives in catalog_node
// (see docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md);
// this reshapes it back - full variant rows and node images included, since
// the storefront renders price, description, and thumbnails from this
// response. Only works for trees up to 3 levels deep - a node nested
// deeper than Category -> Subcategory -> Product has no slot here and is
// simply omitted (toLegacyCategoryShape's own documented behavior).
//
// Falls back to the pre-migration query whenever catalog_node is still
// empty (the backfill script hasn't been run with --apply yet in this
// environment) but real legacy data exists - without this, deploying this
// code ahead of the backfill would make /category return an empty catalog
// instead of erroring loudly or serving real data.
const getCategories = async () => {
  const tree = await getFullTree()
  if (tree.length === 0) {
    const legacyCount = await Category.count()
    if (legacyCount > 0) {
      return await getCategoriesLegacy()
    }
  }
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