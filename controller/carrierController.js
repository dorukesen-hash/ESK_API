const { Op } = require('sequelize')
const  {Carrier, Shipment}  = require('../db/models')
const AppError = require('../utils/appError')

const getCarriers = async () => {
	return await Carrier.findAll()
}

// Admin "Carriers" tab - real usage stats per provider (label/shipment
// count, total shipping cost paid) instead of a bare name list. Sorted by
// shipment count (most-used first) rather than alphabetically, so whichever
// provider the business actually relies on most - e.g. an external freight
// partner used for the bulk of fulfillment - surfaces at the top on its
// own, without hardcoding any one provider as "primary".
const getCarrierStats = async () => {
	const carriers = await Carrier.findAll();

	const stats = await Promise.all(
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

	return stats.sort((a, b) => b.shipmentCount - a.shipmentCount || a.name.localeCompare(b.name));
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