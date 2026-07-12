const { Op } = require('sequelize')



const createAndWhere = (opt) => {
    return opt.length > 1
        ? {
            [Op.and]: [...opt],
        }
        : opt[0]
}
const createOrWhere = (opt) => {
    return opt.length > 1
        ? {
            [Op.or]: [...opt],
        }
        : opt[0]
}

module.exports = {
    createAndWhere,
    createOrWhere
}