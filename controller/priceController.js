const { Op } = require('sequelize')
const  { Price}  = require('../db/models')
const AppError = require('../utils/appError')

const getPrices = async () => {
	return await Price.findAll()
}


const getPrice = async (id) => {
	return await Price.findByPk(id)
}


const savePrice = async (param) => {
	return await Price.create({ ...param })
}

const editPrice = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await Price.update({ ...param },{where: {id: param.id}})
}


const deletePrice = async (id) => {
	return await Price.destroy({where:{id : id}})
}



module.exports = {
	getPrices,
	getPrice,
	savePrice,
	editPrice,
	deletePrice
}