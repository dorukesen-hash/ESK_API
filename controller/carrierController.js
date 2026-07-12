const { Op } = require('sequelize')
const  {Carrier}  = require('../db/models')
const AppError = require('../utils/appError')

const getCarriers = async () => {
	return await Carrier.findAll()
}


const getCarrier = async (id) => {
	return await Carrier.findByPk(id)
}


const saveCarrier = async (param) => {
	return await Carrier.create({ ...param })
}

const editCarrier = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await Carrier.update({ ...param },{where: {id: param.id}})
}


const deleteCarrier = async (id) => {
	return await Carrier.destroy({where:{id : id}})
}



module.exports = {
	getCarriers,
	getCarrier,
	saveCarrier,
	editCarrier,
	deleteCarrier
}