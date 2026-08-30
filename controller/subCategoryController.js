const { Op } = require('sequelize')
const { Subcategory, Category, Image, SubcategoryImages, Spesification, Price, PackageInfo, PalletInfo } = require('../db/models')
const Variant = require('../db/models/variant')
const AppError = require('../utils/appError')
const Description = require('../db/models/description')
const Dimension = require('../db/models/dimensions')

const getSubCategories = async () => {
	return await Subcategory.findAll()
}

const getSubCategoriesByCategoryName = async (name) => {

	let query;
	if(name.includes("%20")) {
		query = name.replace(/%20/g, " ")
	}

	const category = await Category.findOne({
			where:{ name: { [Op.like]: `%${query}%` } },
		})

	return await Subcategory.findAll({
		where: { categoryId: category.id }
	})
}


const getSubcategoryDetails = async (subcategoryId) => {
const data = await Subcategory.findOne({
		where: { id: subcategoryId },
		include: [
			{model: Description, as: 'desc2'},
			{
				model: SubcategoryImages,
				include: [
					{
						model: Image,
						attributes: ['id', 'url']
					}
				],
				separate: true,
				order: [['position', 'ASC']]
			},
			{
              model:Variant ,
			  include: [ 
				{model: Description, as: "desc3"},
				{model: Spesification, as: "spesification"},
				{model: Price},
				{model: Dimension, as: "dim3"},
				{model: PackageInfo, as: "package_info" ,},
				{model: PalletInfo, as: "pallet_info"}
             ]
            }	
		]
	});

	return data;
}


const getSubCategoriesPerCategory = async (id) => {

     return await Subcategory.findAll({
		where: {categoryId: parseInt(id)},
		attributes:[
			'id',
			'name'
		],
		include: [
			{model: Category, as: 'category', attributes: ['id','name']},
			{model: Variant, as: 'variants', where:  {productId: null},required: false,}
		]
	})
}

const getSubCategory = async (id) => {
	return await Subcategory.findOne({where: { id: id}})
}

const getSubCategoryByName = async (name) => {
	return await Subcategory.findOne({ where: { name } })
}

const addSubCategory = async (param) => {
	return await Subcategory.create({ ...param })
}

const saveSubCategory = async (data) => {
	const { categoryId, name, variations} = data;
	let inputVariationList = [];
	//controls
	if  (!categoryId) throw new AppError(`No categoryId found!`, 500)
	if  (!name) throw new AppError(`Subcategory name can not be empthy`, 500)
		
	const newSubCategory = await Subcategory.create({name: name, categoryId: categoryId})
	
	if (variations && variations.length > 0 ) {
		for (let i = 0; i < variations.length; i++) {
			const element = variations[i];
			
			let newElement = {...element, subcategoryId : newSubCategory.dataValues.id}		
			inputVariationList.push(newElement)	
		}
		
		await Variant.bulkCreate(inputVariationList);
	}
	
}

const editSubCategory = async (data) => {
	const { id, name} = data;
	if (!id) throw new AppError('Id not found!', 500)
	if (!name) throw new AppError('Name not found!', 500)
		
	await Subcategory.update({name:name},{where: {id: id}})
}

const deleteSubCategory = async (id) => {
	return await Subcategory.destroy({ where: {id}})
}

module.exports = {
	getSubCategories,
	getSubCategoryByName,
	addSubCategory,
	getSubCategory,
	deleteSubCategory,
	getSubCategoriesPerCategory,
	getSubCategoriesByCategoryName,
	saveSubCategory,
	editSubCategory,
    getSubcategoryDetails
}