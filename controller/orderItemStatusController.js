const { OrderItemStatus } = require('../db/models')
const AppError = require('../utils/appError')

const getOrderItemStatuses = async () => {
	return await OrderItemStatus.findAll()
}

const getOrderItemStatus = async (id) => {
	return await OrderItemStatus.findByPk(id)
}

const saveOrderItemStatus = async (param) => {
	return await OrderItemStatus.create({ ...param })
}

const editOrderItemStatus = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await OrderItemStatus.update({ ...param }, { where: { id: param.id } })
}

const deleteOrderItemStatus = async (id) => {
	return await OrderItemStatus.destroy({ where: { id: id } })
}

module.exports = {
	getOrderItemStatuses,
	getOrderItemStatus,
	saveOrderItemStatus,
	editOrderItemStatus,
	deleteOrderItemStatus
}
