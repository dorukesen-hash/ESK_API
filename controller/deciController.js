const {Deci } = require('../db/models')

const getDecis = async () => {
    return await Deci.findAll()
}

const addDeci = async (param) => {
    return await Deci.create({ ...param })
}

module.exports = {
    getDecis,
    addDeci
}