const AppError = require('../utils/appError')
const  {Featured, Variant}  = require('../db/models');
const { createOrWhere, createAndWhere } = require('./scopes');
const { Op } = require('sequelize');


const getVariantsForFeatured = async (data) => {

	const {
    searchValue,
  } = data;

  const limitx = 10;
  const offset = 0;

  const order = [["createdAt", "ASC"]];

  const whereConditions = [];

  if (searchValue?.length > 0) {
	  const searchField = {
		  [Op.or]: [
			  { title: { [Op.iLike]: `%${searchValue}%` } },
			  { stock: { [Op.iLike]: `%${searchValue}%` } },
		  ],
	  }

	  whereConditions.push(searchField);
	}

    const result = await Variant.findAndCountAll({
	limitx,
    offset,
    order,
    where: createAndWhere(whereConditions),
	attributes: [
      "id",
	  "title",
	  "stock"
    ],
	})

	return result;
}



// Distinct source variants that already have at least one FBT target
// configured, with a target count - lets the admin page open on a list of
// "already set up" sources instead of requiring a fresh search every time.
const getFeaturedSources = async () => {
  const rows = await Featured.findAll({
    attributes: ["source_id"],
    include: [{ model: Variant, as: "source", attributes: ["id", "stock", "title"] }],
    order: [["source_id", "ASC"]],
  });

  const bySource = new Map();
  for (const row of rows) {
    if (!bySource.has(row.source_id)) {
      bySource.set(row.source_id, {
        id: row.source.id,
        title: row.source.title,
        stock: row.source.stock,
        targetCount: 0,
      });
    }
    bySource.get(row.source_id).targetCount += 1;
  }
  return Array.from(bySource.values());
};

const getFeaturedProduct = async (id) => {
  return await Featured.findAll({
    where: { source_id: id },
	attributes:["source_id","target_id"],
    include: [
		{ model: Variant, as: "source", attributes: ["stock","title"] },
        { model: Variant, as: "target",attributes: ["stock","title"] }

	],
  });
};

//Her seferinde tek featured eklenir.
const saveFeaturedProducts = async (body) => {

	const { source_id, target_id } = body;


	if (source_id === target_id) {
      	throw new AppError("Source_id can not be the same as the target_id", 500)
    }

	const existingFeatured = await Featured.findAll({where: {source_id: source_id},attributes:["target_id"]})

	const existingTargetId = existingFeatured.find(x => x.target_id === target_id)

	if(existingTargetId) {
		throw new AppError("Cannot be existing target_id", 500)
	}

	// Şu anda source_id için kaç kayıt var?
    const existingCount = await Featured.count({ where: { source_id } });

	// Eğer toplam 3'ü geçiyorsa hata dön
    if (existingCount + 1 > 3 ) {
      throw new AppError(`There can be a maximum of 3 featured items.`, 500)
    }	

	const created = await Featured.create({source_id : source_id , target_id : target_id})

	return created;
}


const deleteFeaturedProducts = async (target_id) => {

	if (!target_id) {
      throw new AppError("target_id required", 500)
    }

	const deleted = await Featured.destroy({
      where: { target_id : target_id },
    });

	if (deleted === 0) {
      return "No record found"
    }

	return "Featured variant deleted"
}

module.exports = {
	getVariantsForFeatured,
	getFeaturedSources,
	getFeaturedProduct,
	saveFeaturedProducts,
	deleteFeaturedProducts
}