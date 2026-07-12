const { Op } = require('sequelize')
const { PalletInfo } = require('../db/models')
const AppError = require('../utils/appError')

const getPallets = async () => {
	return await PalletInfo.findAll()
}


const getPallet = async (id) => {
	return await PalletInfo.findByPk(id)
}


const savePallet = async (param) => {
	return await PalletInfo.create({ ...param })
}

const editPallet = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await PalletInfo.update({ ...param },{where: {id: param.id}})
}


const deletePallet = async (id) => {
	return await PalletInfo.destroy({where:{id : id}})
}



module.exports = {
	getPallets,
	getPallet,
	savePallet,
	editPallet,
	deletePallet
}