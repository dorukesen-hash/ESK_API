const AppError = require('../utils/appError')
const  { Variant, Subcategory, Category}  = require('../db/models');
const { QueryTypes } = require('sequelize');
const { createAndWhere } = require('./scopes');
const db = require('../db/index.js');

// Full-text search fields grouped by relevance weight (Postgres tsvector
// weight labels, highest to lowest). A title/SKU match should always
// outrank a term that only happens to appear in a marketing bullet point.
const WEIGHT_A_FIELDS = ['title', 'sku'];
const WEIGHT_B_FIELDS = [
  'description',
  'color',
  'material_type',
  'size',
  'style',
  'product_finish',
  'product_grade',
];
const WEIGHT_C_FIELDS = ['bullet_1', 'bullet_2', 'bullet_3', 'bullet_4', 'bullet_5', 'bullet_6'];

function weightedTsvector(columns, weight) {
  const concatenated = columns.map((column) => `coalesce(v.${column}, '')`).join(" || ' ' || ");
  return `setweight(to_tsvector('english', ${concatenated}), '${weight}')`;
}

// Computed inline per query rather than stored as a generated column: this
// repo has no migrations tooling (Sequelize just does a model sync() on
// boot), and the catalog is a couple hundred rows, so there's nothing to
// gain from a GIN-indexed stored column yet. Revisit if the catalog grows
// enough for this to show up as a real query cost.
const SEARCH_VECTOR_SQL = [
  weightedTsvector(WEIGHT_A_FIELDS, 'A'),
  weightedTsvector(WEIGHT_B_FIELDS, 'B'),
  weightedTsvector(WEIGHT_C_FIELDS, 'C'),
].join(' || ');

async function fullTextSearch({ searchValue, limitx, offset, categoryId, subcategoryId }) {
  const replacements = { query: searchValue, limit: limitx, offset };
  let extraFilter = '';

  if (subcategoryId) {
    extraFilter = 'AND v.subcategory_id = :subcategoryId';
    replacements.subcategoryId = parseInt(subcategoryId);
  } else if (categoryId) {
    extraFilter = 'AND v.category_id = :categoryId';
    replacements.categoryId = parseInt(categoryId);
  }

  const rows = await db.query(
    `
    SELECT v.id, v.title, v.sku,
           c.id AS "categoryId", c.name AS "categoryName",
           s.id AS "subcategoryId", s.name AS "subcategoryName",
           ts_rank(${SEARCH_VECTOR_SQL}, websearch_to_tsquery('english', :query)) AS rank
    FROM variant v
    LEFT JOIN category c ON c.id = v.category_id
    LEFT JOIN subcategory s ON s.id = v.subcategory_id
    WHERE (${SEARCH_VECTOR_SQL}) @@ websearch_to_tsquery('english', :query)
      ${extraFilter}
    ORDER BY rank DESC, v.id ASC
    LIMIT :limit OFFSET :offset
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const [{ count }] = await db.query(
    `
    SELECT COUNT(*)::int AS count
    FROM variant v
    WHERE (${SEARCH_VECTOR_SQL}) @@ websearch_to_tsquery('english', :query)
      ${extraFilter}
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    count,
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      sku: row.sku,
      category: { id: row.categoryId, name: row.categoryName },
      subcategory: { id: row.subcategoryId, name: row.subcategoryName },
    })),
  };
}

const searchBarFunc = async (data) => {
  const { searchValue, limit, page, categoryId, subcategoryId } = data;

  const limitx = parseInt(limit ? limit : 10);
  const offset = parseInt(page ? page : 0) * limitx;

  if (searchValue?.length > 0) {
    return fullTextSearch({ searchValue, limitx, offset, categoryId, subcategoryId });
  }

  const whereConditions = [];
  if (subcategoryId) {
    whereConditions.push({ subcategoryId: parseInt(subcategoryId) });
  } else if (categoryId) {
    whereConditions.push({ categoryId: parseInt(categoryId) });
  }

  return Variant.findAndCountAll({
    limit: limitx,
    offset,
    order: [['createdAt', 'ASC']],
    where: createAndWhere(whereConditions),
    attributes: ['id', 'title', 'sku'],
    include: [{ model: Subcategory }, { model: Category }],
  });
};

module.exports = {
	searchBarFunc
}
