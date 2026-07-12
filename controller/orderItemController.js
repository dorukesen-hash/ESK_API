const { OrderItem } = require('../db/models')

const getOrderitems = async () => {
    return await OrderItem.findAll()
}


const addOrderitems = async (param) => {
    return await OrderItem.create({ ...param })
}

module.exports = {
    getOrderitems,
    addOrderitems
}