const { OrderStatus } = require('../db/models')

const getOrderstatus = async () => {
    return await OrderStatus.findAll()
}

const addOrderstatus = async (param) => {
    return await OrderStatus.create({ ...param })
}

module.exports = {
    getOrderstatus,
    addOrderstatus
}