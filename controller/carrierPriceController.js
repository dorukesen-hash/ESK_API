const {CarrierPrice } = require('../db/models')

const getCarrierPrices = async () => {
    return await CarrierPrice.findAll()
}

const getCarrierPricesByName = async (name) => {
    return await CarrierPrice.findOne({ where: { name } })
}

const addCarrierPrices = async (param) => {
    return await CarrierPrice.create({ ...param })
}

module.exports = {
    getCarrierPrices,
    getCarrierPricesByName,
    addCarrierPrices,
}