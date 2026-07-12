const { Op } = require('sequelize')
const  {Description}  = require('../db/models')
const AppError = require('../utils/appError')

const getDescriptions = async () => {
	return await Description.findAll()
}


const getDescription = async (id) => {
	return await Description.findByPk(id)
}


const saveDescription = async (param) => {
	return await Description.create({ ...param })
}

const editDescription = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await Description.update({ ...param },{where: {id: param.id}})
}


const deleteDescription = async (id) => {
	return await Description.destroy({where:{id : id}})
}



module.exports = {
	getDescriptions,
	getDescription,
	saveDescription,
	editDescription,
	deleteDescription
}