const { ShipmentStatus } = require('../db/models')

const getShipmentStatus = async () => {
    return await ShipmentStatus.findAll()
}


const addShipmentStatus = async (param) => {
    return await ShipmentStatus.create({ ...param })
}

module.exports = {
    getShipmentStatus,
    addShipmentStatus
}