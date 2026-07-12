const { OrderItemStatus } = require('../db/models')

const getOrderitemstatus = async () => {
    return await OrderItemStatus.findAll()
}

const addOrderitemstatus = async (param) => {
    return await OrderItemStatus.create({ ...param })
}

module.exports = {
    getOrderitemstatus,
    addOrderitemstatus
}