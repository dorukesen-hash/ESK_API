const { CarrierPrice } = require('../db/models')
const AppError = require('../utils/appError')

const getCarrierPrices = async () => {
	return await CarrierPrice.findAll()
}

const getCarrierPrice = async (id) => {
	return await CarrierPrice.findByPk(id)
}

const addCarrierPrices = async (param) => {
	return await CarrierPrice.create({ ...param })
}

const editCarrierPrice = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await CarrierPrice.update({ ...param }, { where: { id: param.id } })
}

const deleteCarrierPrice = async (id) => {
	return await CarrierPrice.destroy({ where: { id: id } })
}

module.exports = {
	getCarrierPrices,
	getCarrierPrice,
	addCarrierPrices,
	editCarrierPrice,
	deleteCarrierPrice,
}
