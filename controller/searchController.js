const AppError = require('../utils/appError')
const  { Variant, CatalogNode}  = require('../db/models');
const { QueryTypes, Op } = require('sequelize');
const { createAndWhere } = require('./scopes');
const { collectDescendantIds, resolveBreadcrumb } = require('./catalogNodeTree');
const db = require('../db/index.js');

// Loaded once per request and threaded through both the descendant-id
// filter and the result breadcrumb below, instead of each fetching its
// own copy of the (small, a couple hundred rows) catalog_node table.
async function fetchCatalogNodes() {
  return CatalogNode.findAll({ raw: true, attributes: ['id', 'parentId', 'name'] })
}

// `categoryId`/`subcategoryId` here are catalog_node ids (the FE sources
// them from the catalog_node-backed /category and /catalog-node endpoints -
// see docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md),
// not the legacy category/subcategory table ids. catalog_node is a fresh
// table with its own id sequence, so the two never coincide - filtering on
// v.category_id/v.subcategory_id directly (the legacy FK columns) silently
// matched nothing. Resolve the given id's full descendant subtree instead
// and filter on the variant's catalog_node-based `nodeId` column.
function descendantNodeIds(nodeId, catalogNodes) {
  return collectDescendantIds(catalogNodes, parseInt(nodeId))
}

// Full-text search fields grouped by relevance weight (Postgres tsvector
// weight labels, highest to lowest). A title/SKU match should always
// outrank a term that only happens to appear in a marketing bullet point.
// Each entry is a fully-qualified column reference so the joined
// catalog_node name can sit alongside the variant's own columns.
const WEIGHT_A_COLUMNS = ['v.title', 'v.sku'];
const WEIGHT_B_COLUMNS = [
  'v.description',
  'v.color',
  'v.material_type',
  'v.size',
  'v.style',
  'v.product_finish',
  'v.product_grade',
  'cn.name',
];
const WEIGHT_C_COLUMNS = [
  'v.bullet_1',
  'v.bullet_2',
  'v.bullet_3',
  'v.bullet_4',
  'v.bullet_5',
  'v.bullet_6',
];

function weightedTsvector(columns, weight) {
  const concatenated = columns.map((column) => `coalesce(${column}, '')`).join(" || ' ' || ");
  return `setweight(to_tsvector('english', ${concatenated}), '${weight}')`;
}

// Computed inline per query rather than stored as a generated column: this
// repo has no migrations tooling (Sequelize just does a model sync() on
// boot), and the catalog is a couple hundred rows, so there's nothing to
// gain from a GIN-indexed stored column yet. Revisit if the catalog grows
// enough for this to show up as a real query cost.
const SEARCH_VECTOR_SQL = [
  weightedTsvector(WEIGHT_A_COLUMNS, 'A'),
  weightedTsvector(WEIGHT_B_COLUMNS, 'B'),
  weightedTsvector(WEIGHT_C_COLUMNS, 'C'),
].join(' || ');

// websearch_to_tsquery only matches whole lexemes, which breaks the header's
// type-ahead preview (it searches on every keystroke past 3 characters, so
// the query is usually an incomplete word - "eb2", "cor"). Build a prefix
// tsquery instead. Tried hand-splitting the raw input on punctuation first,
// but Postgres's own tokenizer doesn't split the way you'd expect (e.g.
// "CC40/2" comes out as ONE lexeme, 'cc40/2', not 'cc40' + '2') - splitting
// client-side produced terms that could never match. So tokenize through
// to_tsvector() itself (same parser/dictionary the stored columns use, so
// boundaries always agree) and turn each resulting lexeme into a ":*"
// prefix term, ANDed together.
async function buildPrefixTsQuery(searchValue) {
  const [{ lexemes }] = await db.query(
    'SELECT tsvector_to_array(to_tsvector(\'english\', :raw)) AS lexemes',
    { replacements: { raw: searchValue }, type: QueryTypes.SELECT }
  );
  if (!lexemes || lexemes.length === 0) return null;
  return lexemes.map((lexeme) => `${lexeme}:*`).join(' & ');
}

async function fullTextSearch({ searchValue, limitx, offset, categoryId, subcategoryId }) {
  const tsQuery = await buildPrefixTsQuery(searchValue);
  if (!tsQuery) {
    return { count: 0, rows: [] };
  }

  const catalogNodes = await fetchCatalogNodes();
  const replacements = { query: tsQuery, limit: limitx, offset };
  let extraFilter = '';

  const filterNodeId = subcategoryId || categoryId;
  if (filterNodeId) {
    const nodeIds = descendantNodeIds(filterNodeId, catalogNodes);
    // Sequelize substitutes an array replacement as a bare comma-separated
    // list (suited for IN (...)), not an array literal - ANY(:nodeIds)
    // renders as the invalid "ANY(1,2,3)". IN (:nodeIds) is also invalid
    // SQL when the list is empty, so that case is handled by returning no
    // results directly instead of reaching the query.
    if (nodeIds.length === 0) return { count: 0, rows: [] };
    extraFilter = 'AND v.node_id IN (:nodeIds)';
    replacements.nodeIds = nodeIds;
  }

  const rows = await db.query(
    `
    SELECT v.id, v.title, v.sku, v.node_id AS "nodeId",
           ts_rank(${SEARCH_VECTOR_SQL}, to_tsquery('english', :query)) AS rank
    FROM variant v
    LEFT JOIN catalog_node cn ON cn.id = v.node_id
    WHERE (${SEARCH_VECTOR_SQL}) @@ to_tsquery('english', :query)
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
    LEFT JOIN catalog_node cn ON cn.id = v.node_id
    WHERE (${SEARCH_VECTOR_SQL}) @@ to_tsquery('english', :query)
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
      ...resolveBreadcrumb(row.nodeId, catalogNodes),
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

  const catalogNodes = await fetchCatalogNodes();
  const whereConditions = [];
  const filterNodeId = subcategoryId || categoryId;
  if (filterNodeId) {
    whereConditions.push({ nodeId: { [Op.in]: descendantNodeIds(filterNodeId, catalogNodes) } });
  }

  const { count, rows } = await Variant.findAndCountAll({
    limit: limitx,
    offset,
    order: [['createdAt', 'ASC']],
    where: createAndWhere(whereConditions),
    attributes: ['id', 'title', 'sku', 'nodeId'],
  });

  return {
    count,
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      sku: row.sku,
      ...resolveBreadcrumb(row.nodeId, catalogNodes),
    })),
  };
};

module.exports = {
	searchBarFunc
}
