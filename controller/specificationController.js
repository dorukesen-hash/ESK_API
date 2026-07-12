const { Op } = require('sequelize')
const {  Spesification } = require('../db/models')
const AppError = require('../utils/appError')

const getSpecifications = async () => {
	return await Spesification.findAll()
}


const getSpecification = async (id) => {
	return await Spesification.findByPk(id)
}


const saveSpecification = async (param) => {
	return await Spesification.create({ ...param })
}

const editSpecification = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await Spesification.update({ ...param },{where: {id: param.id}})
}


const deleteSpecification = async (id) => {
	return await Spesification.destroy({where:{id : id}})
}



module.exports = {
	getSpecifications,
	getSpecification,
	saveSpecification,
	editSpecification,
	deleteSpecification
}