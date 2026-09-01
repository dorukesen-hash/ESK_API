const { Op } = require('sequelize')
const  {Carrier, Shipment}  = require('../db/models')
const AppError = require('../utils/appError')

const getCarriers = async () => {
	return await Carrier.findAll()
}

// Admin "Carriers" tab - real usage stats per provider (label/shipment
// count, total shipping cost paid) instead of a bare name list.
const getCarrierStats = async () => {
	const carriers = await Carrier.findAll({ order: [['name', 'ASC']] });

	return Promise.all(
		carriers.map(async (carrier) => {
			const shipmentCount = await Shipment.count({ where: { carrierId: carrier.id } });
			const totalPaid = await Shipment.sum('totalPrice', { where: { carrierId: carrier.id } });
			return {
				id: carrier.id,
				name: carrier.name,
				shipmentCount,
				totalPaid: totalPaid || 0,
			};
		})
	);
};


const getCarrier = async (id) => {
	return await Carrier.findByPk(id)
}


const saveCarrier = async (param) => {
	return await Carrier.create({ ...param })
}

const editCarrier = async (param) => {
	if (!param.id) throw new AppError('Id not found!', 500)
	return await Carrier.update({ ...param },{where: {id: param.id}})
}


const deleteCarrier = async (id) => {
	return await Carrier.destroy({where:{id : id}})
}



module.exports = {
	getCarriers,
	getCarrierStats,
	getCarrier,
	saveCarrier,
	editCarrier,
	deleteCarrier
}