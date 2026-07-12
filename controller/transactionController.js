const { Transaction } = require('../db/models')

const getTransactions = async () => {
    return await Transaction.findAll()
}


const createTransaction = async (param) => {
    return await Transaction.create({ ...param })
}

module.exports = {
    getTransactions,
    createTransaction
}