const {Cookie } = require('../db/models')

const getCookies = async () => {
    return await Cookie.findAll()
}


module.exports = {
    getCookies
}