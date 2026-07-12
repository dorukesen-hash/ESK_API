const { Op } = require('sequelize')
const  {Dimensions}  = require('../db/models')
const AppError = require('../utils/appError')

const getDimensions = async () => {
	return await Dimensions.findAll()
}


const getDimension = async (id) => {
	return await Dimensions.findByPk(id)
}


const saveDimension = async (param) => {
	return await Dimensions.create({ ...param })
}

const editDimension = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await Dimensions.update({ ...param },{where: {id: param.id}})
}


const deleteDimension = async (id) => {
	return await Dimensions.destroy({where:{id : id}})
}



module.exports = {
	getDimensions,
	getDimension,
	saveDimension,
	editDimension,
	deleteDimension
}