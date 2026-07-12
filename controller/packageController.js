const { Op } = require('sequelize')
const {  PackageInfo } = require('../db/models')
const AppError = require('../utils/appError')

const getPackages = async () => {
	return await PackageInfo.findAll()
}


const getPackage = async (id) => {
	return await PackageInfo.findByPk(id)
}


const savePackage = async (param) => {
	return await PackageInfo.create({ ...param })
}

const editPackage = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await PackageInfo.update({ ...param },{where: {id: param.id}})
}


const deletePackage = async (id) => {
	return await PackageInfo.destroy({where:{id : id}})
}



module.exports = {
	getPackages,
	getPackage,
	savePackage,
	editPackage,
	deletePackage
}