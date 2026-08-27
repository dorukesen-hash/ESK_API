const { OrderStatus } = require('../db/models')
const AppError = require('../utils/appError')

const getOrderStatuses = async () => {
	return await OrderStatus.findAll()
}

const getOrderStatus = async (id) => {
	return await OrderStatus.findByPk(id)
}

const saveOrderStatus = async (param) => {
	return await OrderStatus.create({ ...param })
}

const editOrderStatus = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await OrderStatus.update({ ...param }, { where: { id: param.id } })
}

const deleteOrderStatus = async (id) => {
	return await OrderStatus.destroy({ where: { id: id } })
}

module.exports = {
	getOrderStatuses,
	getOrderStatus,
	saveOrderStatus,
	editOrderStatus,
	deleteOrderStatus
}
