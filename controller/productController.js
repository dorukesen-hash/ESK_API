const { Op } = require('sequelize')
const { Product, Subcategory, Category, ProductImages, Image, Spesification, Price, PackageInfo, PalletInfo} = require('../db/models')
const Variant = require('../db/models/variant')
const Description = require("../db/models/description");
const Dimension = require('../db/models/dimensions');
const AppError = require('../utils/appError')

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
        separate: true,
        order: [["position", "ASC"]],
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

const reorderProductImages = async (productId, images) => {
    // images: array of { imageId, position }
    
    // Check for duplicate positions
    const positions = images.map(img => img.position)
    const uniquePositions = new Set(positions)
    if (positions.length !== uniquePositions.size) {
        throw new AppError('Duplicate position values found. Each image must have a unique position.', 400)
    }

    // Verify all images belong to this product
    const existingAssociations = await ProductImages.findAll({
        where: {
            productId: productId,
            imageId: images.map(img => img.imageId)
        }
    })

    if (existingAssociations.length !== images.length) {
        throw new AppError('One or more images are not associated with this product', 400)
    }

    // Update positions in a transaction
    const { sequelize } = require('../db/index.js')
    await sequelize.transaction(async (t) => {
        for (const img of images) {
            await ProductImages.update(
                { position: img.position },
                { where: { productId: productId, imageId: img.imageId }, transaction: t }
            )
        }
    })

    return { success: true, message: 'Product images reordered successfully' }
}

module.exports = {
	getProducts,
	getProduct,
	saveProduct,
	editProduct,
	deleteProduct,
	getProductsforSubCategory,
	getProductsFromSubCategoryName,
	getProductDetails,
    reorderProductImages
}