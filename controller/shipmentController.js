const { Op } = require('sequelize');
const { Shipment, Carrier } = require('../db/models');
const { createAndWhere } = require('./scopes');

const getShipments = async (data) => {

    const {
        id,
        limit,
        page,
        sorting,
        searchType,
        searchValue,
      } = data;

  const limitx = parseInt(limit);
  const offset = parseInt(page) * limitx;

  const order = sorting?.length
    ? sorting.map((x) => [x.id, x.desc ? "DESC" : "ASC"])
    : [["createdAt", "DESC"]];

  const whereConditions = [];

  if (id) {
    whereConditions.push({ id });
  }
  
  if (searchValue?.length > 0) {
    const searchField =
      searchType === "name"
        ? { name: { [Op.iLike]: `%${searchValue}%` } }
        : searchType === "trackingnumber"
        ? { tracking: { [Op.iLike]: `%${searchValue}%` } }
        : {
            name: { [Op.iLike]: `%${searchValue}%` },
          };

    whereConditions.push(searchField);
  }

   const result = await Shipment.findAndCountAll({
    limitx,
    offset,
    order,
    where: createAndWhere(whereConditions),
    distinct: true,
    include: [ 
       {
        model: Carrier
        }]

   })

   return result;  
}

const getSingleShipment = async (id) => {
      return await Shipment.findOne({
      where: { id: id},
       include: [
          {model: Carrier}]})
}

const updateShipment  = async (id, data) => {
    const {tracking, adminNote} = data;

  const shipment =  await Shipment.findOne({where: {id}})

  shipment.tracking = tracking;
  shipment.extra_informations = {adminNote: adminNote}
  await shipment.save();

}


const addShipment = async (param) => {
    return await Shipment.create({ ...param })
}

module.exports = {
    getShipments,
    addShipment,
    getSingleShipment,
    updateShipment
}