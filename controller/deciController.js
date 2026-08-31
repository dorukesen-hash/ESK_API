const { Deci } = require('../db/models')
const AppError = require('../utils/appError')

const getDecis = async () => {
	return await Deci.findAll()
}

const getDeci = async (id) => {
	return await Deci.findByPk(id)
}

const saveDeci = async (param) => {
	return await Deci.create({ ...param })
}

const editDeci = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await Deci.update({ ...param },{where: {id: param.id}})
}

const deleteDeci = async (id) => {
	return await Deci.destroy({where:{id : id}})
}

module.exports = {
	getDecis,
	getDeci,
	saveDeci,
	editDeci,
	deleteDeci
}
