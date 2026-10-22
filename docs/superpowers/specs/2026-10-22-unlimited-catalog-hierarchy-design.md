# Unlimited-depth catalog hierarchy — design

Date: 2026-10-22
Scope: ESK_API (schema + endpoints), ESK_ADMIN (management UI).
Explicitly out of scope: ESK_FE_V2 (storefront). The storefront keeps
consuming the current `/category` payload shape unchanged until a
follow-up round; it is not touched by this spec or its implementation
plan.

## Problem

The catalog is hard-coded to exactly three levels: `Category` →
`Subcategory` → `Product`, each a separate table with a fixed
`belongsTo` relation, plus an optional skip: a `Variant` can attach
directly to a `Category` or `Subcategory`, bypassing `Product`. This
is baked into the schema (three separate tables, three separate FK
columns on `Variant`: `categoryId`, `subcategoryId`, `productId`) and
into application code — e.g. `variantController.js`'s sibling-lookup
logic is a literal three-branch `if (productId) ... else if
(subcategoryId) ... else if (categoryId)`.

Adding a fourth level (or any arbitrary depth) today means adding a
new table and threading a new FK through every controller, router,
and admin form that touches the hierarchy. The business wants to be
able to nest categories arbitrarily deep without a schema change each
time.

## Decision: self-referencing single table (adjacency list)

Replace `Category`, `Subcategory`, and `Product` with one table,
`CatalogNode`, where each row has a nullable, self-referencing
`parentId`. A node with `parentId: null` is a root (today's
"Category"). Depth is no longer fixed — adding a level is adding a
row with the right `parentId`, not a migration.

Two other options were considered and rejected for now:

- **Materialized path** (store each node's full ancestor-id path for
  descendant/ancestor queries without recursion): unnecessary — the
  catalog is small enough that the entire tree is already fetched in
  one unfiltered query per request (see `categoryController.js`'s
  `getCategories`, and the ESK_FE_V2 comment confirming the whole tree
  is fetched once client-side). Ancestor walks for breadcrumbs are a
  handful of rows at most.
- **Closure table** (separate ancestor/descendant/depth rows): solves
  a scale and write-amplification problem this catalog doesn't have.
  Structural edits are rare and admin-driven; a closure table's
  O(n) maintenance cost on every move isn't worth paying for here.

`Variant` stays its own table (not folded into `CatalogNode`). It
keeps a single foreign key to whichever node it's attached to.

## Data model (ESK_API)

New table `catalog_node`:

| column | type | notes |
|---|---|---|
| `id` | PK | |
| `name` | STRING | required for display; union of `Category.name` / `Subcategory.name` / `Product.title` |
| `description` | TEXT, nullable | from `Product.description` (Subcategory/Category never had their own TEXT description column) |
| `sku` | STRING, nullable | from `Product.sku` — only populated on product-level nodes |
| `available` | BOOLEAN, nullable | from `Subcategory.available` / `Product.available` |
| `stockLevel` | INTEGER, nullable | from `Product.stockLevel` |
| `stockAlertLevel` | INTEGER, nullable | from `Product.stockAlertLevel` |
| `extradata` | JSONB, nullable | from `Product.extradata` |
| `description_id` | FK → `description`, nullable | replaces the separate `Subcategory.belongsTo(Description, as: desc2)` / `Product.belongsTo(Description, as: desc1)` relations with one |
| `parentId` | FK → `catalog_node.id`, nullable | self-reference; null = root |

Not carried forward: `Subcategory.sellProduct` — grepped across the
codebase and it is read nowhere outside its own model definition.
Confirmed dropped; no equivalent column on `CatalogNode`.

New table `catalog_node_images` (replaces `SubcategoryImages` and
`ProductImages`):

| column | type | notes |
|---|---|---|
| `id` | PK | |
| `nodeId` | FK → `catalog_node.id` | |
| `imageId` | FK → `image.id` | |
| `position` | INTEGER | needed for the reorder endpoints added on `main` since this spec was scoped (`reorderSubCategoryImages`, `reorderProductImages`) — their `catalog_node_images` equivalent must keep working the same way |

`Variant` changes: drop `categoryId`, `subcategoryId`, `productId`;
add a single required `nodeId` (FK → `catalog_node.id`). Every
variant attaches to exactly one node, at whatever depth that node
happens to sit.

Associations (Sequelize):

```
CatalogNode.belongsTo(CatalogNode, { as: 'parent', foreignKey: 'parentId' })
CatalogNode.hasMany(CatalogNode, { as: 'children', foreignKey: 'parentId' })
CatalogNode.hasMany(Variant, { foreignKey: 'nodeId' })
Variant.belongsTo(CatalogNode, { foreignKey: 'nodeId' })
CatalogNode.hasMany(CatalogNodeImages, { foreignKey: 'nodeId' })
CatalogNodeImages.belongsTo(Image)
Description.hasMany(CatalogNode, { foreignKey: 'description_id' })
CatalogNode.belongsTo(Description, { foreignKey: 'description_id' })
```

A node may have children, variants, or both at once — this already
happens today (a `Category` can have both `Subcategory` children and
variants attached directly) and the new model keeps that unchanged;
it just stops being level-specific.

## API (ESK_API)

`categoryController.js`, `subCategoryController.js`, and
`productController.js` collapse into one `catalogNodeController.js`:

- `getTree()` — fetch every `catalog_node` row unfiltered (same
  access pattern as today's `getCategories`), build the tree in
  application code by grouping on `parentId`. No recursive SQL.
- `getNode(id)` — single node plus its ancestor chain (for breadcrumbs)
  and direct children. The ancestor chain is a plain loop following
  `parentId` up to `null`; given the catalog's depth this is a few
  queries at most (or one `findAll` + in-memory walk if we fetch the
  whole tree anyway).
- `createNode(parentId, data)`, `updateNode(id, data)` — `parentId`
  can point at any existing node or be null.
- `deleteNode(id)` — recursive: collect the node's full subtree
  (walk `children` down), delete every variant attached to any node
  in that subtree, then delete the nodes themselves, bottom-up, in
  one transaction. Replaces today's `deleteCategory`'s hard-coded
  three-level cascade (`category` → its `subcategories` → their
  `products` → variants).
- `reorderNodeImages(nodeId, images)` — one implementation replacing
  the three near-identical `reorderProductImages` /
  `reorderSubCategoryImages` functions added on `main`.

`variantController.js`: the three-branch level `if/else` in the
siblings lookup is replaced by one rule — siblings are every variant
sharing the same `nodeId` as the current variant. This is strictly
simpler than today's code, not just equivalent: there is no longer a
"which of three columns is populated" branch to maintain.

New routes mount under `/catalog-node`. `/subcategory` and `/product`
are retired once ESK_ADMIN no longer calls them.

`/category` is **not** retired — ESK_FE_V2 still calls it directly
(`hooks/useCategories.js`) and is explicitly out of scope for this
round. It becomes a compatibility shim: reshape the `catalog_node`
tree back into the legacy `{ category: { subcategories: [{
products: [{ variants }], variants }], variants } }` JSON. This only
works cleanly for trees up to three levels deep — a node nested
deeper than Category → Subcategory → Product has no slot in that
legacy shape and simply won't appear in it. That's an accepted,
temporary limitation: deeper nesting is an API/Admin-only capability
until ESK_FE_V2 is migrated in a follow-up round.

## Admin UI (ESK_ADMIN)

- `CategoryFormModal.js`, `SubcategoryFormModal.js`,
  `ProductFormModal.js` collapse into one `CatalogNodeFormModal.js`:
  name, description, image(s), availability, and a parent-picker that
  can target any existing node at any depth (not three fixed
  dropdowns).
- A new recursive tree view (expand/collapse at any depth) replaces
  whatever currently renders the fixed two-level category/subcategory
  list — this is the admin's entry point for add/edit/delete at any
  node.
- `ProductsSection.js`'s variant-creation flow replaces its three
  cascading category→subcategory→product dropdowns with the same
  parent-picker used in the node form — a variant is created by
  picking the one node it attaches to, at whatever depth.
- This work lands on ESK_ADMIN's existing `work/local-updates` branch,
  consistent with how admin changes have been batched so far — no new
  branch.

## Migration (live data, phased and reversible)

1. Add `catalog_node`, `catalog_node_images`, and `variant.nodeId`
   (nullable at first) alongside the existing tables/columns. Nothing
   existing is removed yet.
2. One-time backfill script:
   - Every `Category` row → a `catalog_node` row, `parentId: null`.
   - Every `Subcategory` row → a `catalog_node` row, `parentId` =
     the new node id for its `categoryId`.
   - Every `Product` row → a `catalog_node` row, `parentId` = the new
     node id for its `subcategoryId`.
   - Every `Variant` row gets `nodeId` set to the new node id matching
     whichever of `productId` / `subcategoryId` / `categoryId` was
     populated, deepest wins — the exact same fallback order
     `variantController.js` uses today, just computed once instead of
     on every request.
   - `SubcategoryImages` / `ProductImages` rows copy across to
     `catalog_node_images` with their `position` preserved.
   - Verification: row counts (`category` + `subcategory` + `product`
     count must equal `catalog_node` count) and a spot-check that
     every variant's resolved `nodeId` maps back to the same
     product/subcategory/category it pointed to before.
3. Switch `ESK_API` controllers/routes and `ESK_ADMIN` forms over to
   the new table. Old tables/columns stay in place, unread, as a
   rollback path.
4. Once the new path has run clean for a confirmed period, drop
   `category`, `subcategory`, `product`, `SubcategoryImages`,
   `ProductImages`, and `Variant.categoryId` /
   `Variant.subcategoryId` / `Variant.productId` in a separate,
   explicitly-approved migration.

## Testing

- Backfill script: automated row-count parity check (old 3-table
  total vs. new `catalog_node` count) and a sample-based check that
  each migrated variant's `nodeId` resolves to the same leaf the old
  fallback logic would have picked.
- `catalogNodeController` unit tests: tree building from a flat node
  list, ancestor-chain walk, recursive delete (subtree + attached
  variants removed, nothing outside the subtree touched).
- ESK_ADMIN: CRUD through the new tree UI at depth > 2 (today
  impossible to exercise, since depth was capped at Category →
  Subcategory → Product).

## Decisions (resolved during spec review)

- New public API path is `/catalog-node` (not `/category`) — more
  honest once the table is generic. `/category` is kept only as the
  ESK_FE_V2 compatibility shim described above, not as the primary
  path for new consumers (ESK_ADMIN moves to `/catalog-node`).
- `Subcategory.sellProduct` is dropped. Confirmed unused.
