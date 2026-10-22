# Unlimited-Depth Catalog Hierarchy (ESK_API foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-referencing `CatalogNode` table (and the controller/route code around it) so the catalog can nest to any depth, without touching or removing anything that exists today.

**Architecture:** One new table, `catalog_node`, with a nullable self-referencing `parentId` replaces the fixed-depth `Category` → `Subcategory` → `Product` chain. `Variant` stays its own table; it gets one new nullable `nodeId` column alongside (not instead of, yet) its existing `categoryId`/`subcategoryId`/`productId`. All tree-shaping logic (build a nested tree from a flat row list, walk ancestors, collect a subtree's ids, reshape into the legacy JSON shape) lives in pure, dependency-free functions so it can be unit-tested without a database. Everything in this plan is additive: old tables, old columns, old routes, and ESK_ADMIN's existing behavior are untouched and keep working exactly as they do today.

**Tech Stack:** Node.js, Express, Sequelize (Postgres), `node:test` (Node's built-in test runner — no new dependency).

**Spec:** `docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md`

## Global Constraints

- **Additive only.** No existing table, column, model, route, or controller function is removed, renamed, or changed in a way that alters its current behavior — except `categoryController.js`'s `getCategories`, whose *output shape* must stay identical even though its *implementation* changes (Task 7).
- `GET /category` must keep returning the exact legacy nested shape — ESK_FE_V2 calls it directly today and is out of scope for this round.
- New public read path: `GET /catalog-node`, `GET /catalog-node/:id` (no auth, matching `/category`'s current access level).
- New admin path: `/admin/catalog-node` (full CRUD) — gated for free by `adminRouter.js`'s existing router-level `requireAuth`/`requireAdmin` (`routes/adminRouter.js:28-29`), no per-route middleware needed.
- No new test framework. ESK_API has zero existing test files or test script. Use `node:test` + `node:assert/strict` (built into Node 20, zero dependencies) for every pure-logic test in this plan. DB-touching code (Sequelize calls, routes) is verified manually against the running dev server, per each task's own instructions — introducing a DB-mocking framework is out of scope.
- `Subcategory.sellProduct` and `Subcategory.imgurl` / `Product.imgurl` are **not** carried onto `CatalogNode` — grepped across the codebase; all three are read nowhere outside their own model file.
- The backfill script (Task 6) defaults to a dry run (report only, no writes). Running it with `--apply` against the real configured database is **not** part of "finish Task 6" — it is a separate, explicitly-approved step taken only when the user says so.
- Task 7 (the `/category` legacy shim) only returns correct data once Task 6's backfill has actually run with `--apply` in that environment. Do not deploy Task 7 ahead of a completed backfill.
- Out of scope, deliberately: `routes/subCategoryRouter.js`, `routes/productRouter.js`, `/admin/category`, `/admin/subcategory`, `/admin/product`, `controller/adminController.js`'s existing category/subcategory/product functions, and `variantController.js`'s `saveVariant` / `uploadVariantExcel` / `dataForExcelDropdown`. These keep reading and writing the old columns exactly as today. Their only caller is ESK_ADMIN's current UI, which is not being migrated in this round — that is a separate, follow-up plan once this foundation is live.
- The spec's "siblings lookup" simplification (a 3-branch `categoryId`/`subcategoryId`/`productId` fallback in `variantController.js`) does not exist on `main` as of this plan — it lives only on the separate, unmerged `variant-siblings-table` branch. There is nothing on `main` for this plan to simplify. Whoever merges that branch later will need to adapt its level-fallback logic to `nodeId` themselves (flagging this as a real future merge consideration, not an oversight here).

## Review Focus

- A node with descendants nested several levels deep, with variants attached at more than one of those depths, gets deleted → every variant and every descendant node must be gone, nothing orphaned. Pinned by Task 2's `collectDescendantIds` tests.
- A variant attached directly to a root-level node (no intermediate levels at all) must still appear correctly wherever variants are attached to nodes and in the legacy shim — depth-1 attachment is not a special case. Pinned by Task 2's `attachVariantsToTree` and `toLegacyCategoryShape` tests.
- Moving a node to become a child of one of its own descendants (or of itself) must be rejected, not silently create a cycle that would hang any future tree walk. Pinned by Task 2's cycle-detection test and Task 4's `updateNode` test.
- A `catalog_node` tree deeper than three levels reaching the legacy `/category` shim must degrade gracefully — the extra depth is omitted, never crashes, and never gets merged into the wrong parent. Pinned by Task 2's `toLegacyCategoryShape` test.
- A variant whose legacy FKs are inconsistently populated (e.g. `productId` set, but pointing at a product under a *different* subcategory than the variant's own `subcategoryId`) must resolve to the deepest one (`productId`) during backfill, exactly like the pre-existing runtime fallback did — not whichever column happens to be checked first. Pinned by Task 2's `resolveLegacyNodeKey` test.

---

### Task 1: `CatalogNode` + `CatalogNodeImages` models and associations

**Files:**
- Create: `db/models/catalogNode.js`
- Create: `db/models/catalogNodeImages.js`
- Create: `db/models/catalogNode.test.js`
- Modify: `db/models/index.js:1-42` (requires), `db/models/index.js:156-157` (associations, inserted before the `Description.hasMany(Product...)` block), `db/models/index.js:249-292` (exports)
- Modify: `package.json` (add a `test` script)

**Interfaces:**
- Produces: `CatalogNode` (Sequelize model; fields `name`, `description`, `sku`, `available`, `stockLevel`, `stockAlertLevel`, `extradata`; associations `.parent`, `.children`, `.variants`, `.images`), `CatalogNodeImages` (fields `position`; FKs `nodeId`, `imageId`). Both exported from `db/models/index.js` alongside the existing models. `Variant` gains a `nodeId` column and a `.catalogNode` association.

- [ ] **Step 1: Add the `test` script to `package.json`**

In `package.json`, change:
```json
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  },
```
to:
```json
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "test": "node --test"
  },
```

- [ ] **Step 2: Write the failing test**

Create `db/models/catalogNode.test.js`:
```js
const test = require('node:test')
const assert = require('node:assert/strict')
const { CatalogNode, CatalogNodeImages, Variant } = require('../models')

test('CatalogNode defines its own scalar fields', () => {
  const attrs = CatalogNode.rawAttributes
  for (const field of ['name', 'description', 'sku', 'available', 'stockLevel', 'stockAlertLevel', 'extradata']) {
    assert.ok(field in attrs, `expected CatalogNode to define ${field}`)
  }
})

test('CatalogNode self-references via parent/children', () => {
  assert.equal(CatalogNode.associations.parent.target, CatalogNode)
  assert.equal(CatalogNode.associations.parent.foreignKey, 'parentId')
  assert.equal(CatalogNode.associations.children.target, CatalogNode)
})

test('CatalogNode has a variants association, and Variant points back via nodeId', () => {
  assert.equal(CatalogNode.associations.variants.target, Variant)
  assert.equal(Variant.associations.catalogNode.target, CatalogNode)
  assert.equal(Variant.associations.catalogNode.foreignKey, 'nodeId')
})

test('CatalogNode has an images association to CatalogNodeImages', () => {
  assert.equal(CatalogNode.associations.images.target, CatalogNodeImages)
  assert.equal(CatalogNodeImages.associations.catalogNode.target, CatalogNode)
})
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `npm test`
Expected: FAIL — `CatalogNode` is undefined (not exported from `db/models/index.js` yet).

- [ ] **Step 4: Create the `CatalogNode` model**

Create `db/models/catalogNode.js`:
```js
const Sequelize = require('sequelize')
const db = require('../index.js')

// Replaces Category/Subcategory/Product (see
// docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md):
// one self-referencing table instead of three fixed-depth ones. `parentId`
// (added via the self-association in models/index.js, not declared here -
// matching how every other FK column in this codebase is added purely
// through an association, never a field definition) is what makes depth
// unlimited: null means a root node, otherwise it's a child of another
// catalog_node row at any depth.
const CatalogNode = db.define('catalog_node', {
  name: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  sku: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  available: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  stockLevel: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  stockAlertLevel: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  extradata: {
    type: Sequelize.JSONB,
    allowNull: true,
  },
})

module.exports = CatalogNode
```

- [ ] **Step 5: Create the `CatalogNodeImages` model**

Create `db/models/catalogNodeImages.js`:
```js
const Sequelize = require('sequelize')
const db = require('../index.js')

// Replaces SubcategoryImages/ProductImages - one join table instead of two,
// since catalog_node replaces Subcategory/Product. `position` drives the
// same reorder behavior as the existing reorderProductImages /
// reorderSubCategoryImages (see controller/catalogNodeController.js).
const CatalogNodeImages = db.define('catalog_node_images', {
  position: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
})

module.exports = CatalogNodeImages
```

- [ ] **Step 6: Wire requires, associations, and exports in `db/models/index.js`**

At the top, after `const InvoiceLineItems = require('./invoiceLineItems')` (`db/models/index.js:42`), add:
```js
const CatalogNode = require('./catalogNode')
const CatalogNodeImages = require('./catalogNodeImages')
```

Immediately before the `Description.hasMany(Product, {foreignKey: 'description_id'})` line (`db/models/index.js:159` before this edit), add:
```js
// CatalogNode - self-referencing tree, replaces the fixed-depth
// Category/Subcategory/Product chain above. See
// docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md.
CatalogNode.belongsTo(CatalogNode, { as: 'parent', foreignKey: 'parentId' })
CatalogNode.hasMany(CatalogNode, { as: 'children', foreignKey: 'parentId' })

CatalogNode.hasMany(Variant, { as: 'variants', foreignKey: 'nodeId' })
Variant.belongsTo(CatalogNode, { as: 'catalogNode', foreignKey: 'nodeId' })

CatalogNode.hasMany(CatalogNodeImages, { as: 'images', foreignKey: 'nodeId' })
CatalogNodeImages.belongsTo(CatalogNode, { as: 'catalogNode', foreignKey: 'nodeId' })

Image.hasMany(CatalogNodeImages, { foreignKey: 'imageId' })
CatalogNodeImages.belongsTo(Image, { foreignKey: 'imageId' })

Description.hasMany(CatalogNode, { foreignKey: 'description_id' })
CatalogNode.belongsTo(Description, { as: 'desc', foreignKey: 'description_id' })

```

In the `module.exports` block (`db/models/index.js:249-292`), add `CatalogNode` and `CatalogNodeImages` after `InvoiceLineItems`:
```js
		OrderAuditLog,
		OrderItemRefund,
		InvoiceLineItems,
		CatalogNode,
		CatalogNodeImages
	};
```

- [ ] **Step 7: Run the test to confirm it passes**

Run: `npm test`
Expected: PASS, all 4 tests green. Note: requiring `db/models` also triggers the app's existing `db.sync()` call (`db/index.js:45`) in the background against whatever `DATABASE_URL` is configured locally — this is pre-existing behavior (every script or test that requires `db/models` does this), and `sync({ force: false })` only ever adds missing tables/columns, never drops or alters existing ones. Expect to see `catalog_node` and `catalog_node_images` tables appear in that database as a side effect of running this test — that is intended, not a bug.

- [ ] **Step 8: Commit**

```bash
git add package.json db/models/catalogNode.js db/models/catalogNodeImages.js db/models/catalogNode.test.js db/models/index.js
git commit -m "Add CatalogNode + CatalogNodeImages models (self-referencing tree)"
```

---

### Task 2: Pure catalog-node tree helpers

**Files:**
- Create: `controller/catalogNodeTree.js`
- Create: `controller/catalogNodeTree.test.js`

**Interfaces:**
- Consumes: nothing (pure functions over plain arrays/objects — no Sequelize, no I/O).
- Produces:
  - `buildTree(nodes: {id, parentId, ...}[]): node[]` — each returned node has a `children: node[]` array; `nodes` with a missing/self/cyclic `parentId` become roots.
  - `ancestorChain(nodeId: number, nodes: {id, parentId}[]): node[]` — root-first, inclusive of the target node itself; `[]` if `nodeId` isn't found.
  - `collectDescendantIds(nodes: {id, parentId}[], rootId: number): number[]` — includes `rootId` itself, breadth-first, cycle-safe.
  - `attachVariantsToTree(tree: node[], variants: {nodeId, ...}[]): node[]` — adds a `variants: []` array to every node in the tree, at every depth.
  - `resolveLegacyNodeKey(variant: {categoryId, subcategoryId, productId}): {type: 'product'|'subcategory'|'category', legacyId: number} | null` — deepest-populated-column wins.
  - `toLegacyCategoryShape(tree: node[]): object[]` — reshapes a (post-`attachVariantsToTree`) tree into the legacy `{ id, name, variants, subcategories: [{ id, name, available, variants, products: [{ id, title, sku, description, variants }] }] }` JSON; nodes nested deeper than 3 levels are omitted.

- [ ] **Step 1: Write the failing tests for `buildTree`**

Create `controller/catalogNodeTree.test.js`:
```js
const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildTree,
  ancestorChain,
  collectDescendantIds,
  attachVariantsToTree,
  resolveLegacyNodeKey,
  toLegacyCategoryShape,
} = require('./catalogNodeTree')

test('buildTree: empty input returns no roots', () => {
  assert.deepEqual(buildTree([]), [])
})

test('buildTree: nests children arbitrarily deep', () => {
  const nodes = [
    { id: 1, name: 'Root', parentId: null },
    { id: 2, name: 'Mid', parentId: 1 },
    { id: 3, name: 'Leaf', parentId: 2 },
    { id: 4, name: 'DeepLeaf', parentId: 3 },
  ]
  const tree = buildTree(nodes)
  assert.equal(tree.length, 1)
  assert.equal(tree[0].id, 1)
  assert.equal(tree[0].children[0].id, 2)
  assert.equal(tree[0].children[0].children[0].id, 3)
  assert.equal(tree[0].children[0].children[0].children[0].id, 4)
})

test('buildTree: a node whose parentId points nowhere becomes a root', () => {
  const nodes = [{ id: 1, name: 'Orphan', parentId: 999 }]
  const tree = buildTree(nodes)
  assert.deepEqual(tree.map((n) => n.id), [1])
})

test('buildTree: a node pointing at itself as parent becomes a root, not its own child', () => {
  const nodes = [{ id: 1, name: 'SelfRef', parentId: 1 }]
  const tree = buildTree(nodes)
  assert.equal(tree.length, 1)
  assert.equal(tree[0].children.length, 0)
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: FAIL — `catalogNodeTree.js` doesn't exist yet.

- [ ] **Step 3: Implement `buildTree`**

Create `controller/catalogNodeTree.js`:
```js
function buildTree(nodes) {
  const byId = new Map()
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] })
  }

  const roots = []
  for (const node of byId.values()) {
    const hasValidParent =
      node.parentId != null && node.parentId !== node.id && byId.has(node.parentId)
    if (hasValidParent) {
      byId.get(node.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

module.exports = { buildTree }
```

- [ ] **Step 4: Run to confirm it passes**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing tests for `ancestorChain`**

Append to `controller/catalogNodeTree.test.js`:
```js
test('ancestorChain: returns an empty array for an unknown node', () => {
  assert.deepEqual(ancestorChain(999, []), [])
})

test('ancestorChain: a root node with no parent returns just itself', () => {
  const nodes = [{ id: 1, parentId: null }]
  const chain = ancestorChain(1, nodes)
  assert.deepEqual(chain.map((n) => n.id), [1])
})

test('ancestorChain: returns root-first, inclusive of the target', () => {
  const nodes = [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
    { id: 3, parentId: 2 },
  ]
  const chain = ancestorChain(3, nodes)
  assert.deepEqual(chain.map((n) => n.id), [1, 2, 3])
})
```

- [ ] **Step 6: Run to confirm it fails**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: FAIL — `ancestorChain` is not exported.

- [ ] **Step 7: Implement `ancestorChain`**

In `controller/catalogNodeTree.js`, add:
```js
function ancestorChain(nodeId, nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const chain = []
  const visited = new Set()
  let current = byId.get(nodeId)
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    chain.unshift(current)
    current = current.parentId != null ? byId.get(current.parentId) : undefined
  }
  return chain
}
```
Update the `module.exports` line to:
```js
module.exports = { buildTree, ancestorChain }
```

- [ ] **Step 8: Run to confirm it passes**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: PASS (7 tests).

- [ ] **Step 9: Write the failing tests for `collectDescendantIds`**

Append:
```js
test('collectDescendantIds: includes the root itself even with no children', () => {
  const nodes = [{ id: 1, parentId: null }]
  assert.deepEqual(collectDescendantIds(nodes, 1), [1])
})

test('collectDescendantIds: collects every descendant at every depth', () => {
  const nodes = [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
    { id: 3, parentId: 1 },
    { id: 4, parentId: 2 },
    { id: 5, parentId: 4 },
  ]
  const ids = collectDescendantIds(nodes, 1)
  assert.deepEqual([...ids].sort(), [1, 2, 3, 4, 5])
})

test('collectDescendantIds: a sibling subtree is not included', () => {
  const nodes = [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
    { id: 3, parentId: 1 },
    { id: 4, parentId: 3 },
  ]
  const ids = collectDescendantIds(nodes, 2)
  assert.deepEqual(ids, [2])
})

test('collectDescendantIds: a cyclic parentId chain in the data does not hang', () => {
  const nodes = [
    { id: 1, parentId: 2 },
    { id: 2, parentId: 1 },
  ]
  const ids = collectDescendantIds(nodes, 1)
  assert.deepEqual([...ids].sort(), [1, 2])
})
```

- [ ] **Step 10: Run to confirm it fails, then implement**

Run: `node --test controller/catalogNodeTree.test.js` → FAIL (not exported).

Add to `controller/catalogNodeTree.js`:
```js
function collectDescendantIds(nodes, rootId) {
  const childrenByParent = new Map()
  for (const node of nodes) {
    const key = node.parentId ?? null
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key).push(node.id)
  }

  const result = [rootId]
  const visited = new Set([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()
    const children = childrenByParent.get(current) ?? []
    for (const childId of children) {
      if (visited.has(childId)) continue
      visited.add(childId)
      result.push(childId)
      queue.push(childId)
    }
  }
  return result
}
```
Update `module.exports`:
```js
module.exports = { buildTree, ancestorChain, collectDescendantIds }
```

- [ ] **Step 11: Run to confirm it passes**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: PASS (11 tests).

- [ ] **Step 12: Write the failing tests for `attachVariantsToTree`**

Append:
```js
test('attachVariantsToTree: attaches variants at every depth, including the root', () => {
  const tree = buildTree([
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
  ])
  const variants = [
    { id: 100, nodeId: 1 },
    { id: 101, nodeId: 2 },
  ]
  const result = attachVariantsToTree(tree, variants)
  assert.deepEqual(result[0].variants.map((v) => v.id), [100])
  assert.deepEqual(result[0].children[0].variants.map((v) => v.id), [101])
})

test('attachVariantsToTree: a node with no variants gets an empty array, not undefined', () => {
  const tree = buildTree([{ id: 1, parentId: null }])
  const result = attachVariantsToTree(tree, [])
  assert.deepEqual(result[0].variants, [])
})
```

- [ ] **Step 13: Run to confirm it fails, then implement**

Run: `node --test controller/catalogNodeTree.test.js` → FAIL.

Add to `controller/catalogNodeTree.js`:
```js
function attachVariantsToTree(tree, variants) {
  const variantsByNodeId = new Map()
  for (const variant of variants) {
    if (!variantsByNodeId.has(variant.nodeId)) variantsByNodeId.set(variant.nodeId, [])
    variantsByNodeId.get(variant.nodeId).push(variant)
  }

  function attach(node) {
    return {
      ...node,
      variants: variantsByNodeId.get(node.id) ?? [],
      children: node.children.map(attach),
    }
  }

  return tree.map(attach)
}
```
Update `module.exports`:
```js
module.exports = { buildTree, ancestorChain, collectDescendantIds, attachVariantsToTree }
```

- [ ] **Step 14: Run to confirm it passes**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: PASS (13 tests).

- [ ] **Step 15: Write the failing tests for `resolveLegacyNodeKey`**

Append:
```js
test('resolveLegacyNodeKey: no legacy hierarchy at all returns null', () => {
  assert.equal(resolveLegacyNodeKey({ categoryId: null, subcategoryId: null, productId: null }), null)
})

test('resolveLegacyNodeKey: only categoryId set resolves to category', () => {
  assert.deepEqual(resolveLegacyNodeKey({ categoryId: 5, subcategoryId: null, productId: null }), {
    type: 'category',
    legacyId: 5,
  })
})

test('resolveLegacyNodeKey: subcategoryId wins over categoryId when both are set', () => {
  assert.deepEqual(resolveLegacyNodeKey({ categoryId: 5, subcategoryId: 9, productId: null }), {
    type: 'subcategory',
    legacyId: 9,
  })
})

test('resolveLegacyNodeKey: productId wins over subcategoryId and categoryId, even if inconsistent', () => {
  // A variant whose productId points at a product under a *different*
  // subcategory than the variant's own subcategoryId still resolves to the
  // product - the deepest populated column wins, unconditionally, exactly
  // like the pre-existing runtime fallback in variantController.js did.
  assert.deepEqual(resolveLegacyNodeKey({ categoryId: 5, subcategoryId: 9, productId: 42 }), {
    type: 'product',
    legacyId: 42,
  })
})
```

- [ ] **Step 16: Run to confirm it fails, then implement**

Run: `node --test controller/catalogNodeTree.test.js` → FAIL.

Add to `controller/catalogNodeTree.js`:
```js
function resolveLegacyNodeKey(variant) {
  if (variant.productId != null) return { type: 'product', legacyId: variant.productId }
  if (variant.subcategoryId != null) return { type: 'subcategory', legacyId: variant.subcategoryId }
  if (variant.categoryId != null) return { type: 'category', legacyId: variant.categoryId }
  return null
}
```
Update `module.exports`:
```js
module.exports = {
  buildTree,
  ancestorChain,
  collectDescendantIds,
  attachVariantsToTree,
  resolveLegacyNodeKey,
}
```

- [ ] **Step 17: Run to confirm it passes**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: PASS (17 tests).

- [ ] **Step 18: Write the failing tests for `toLegacyCategoryShape`**

Append:
```js
test('toLegacyCategoryShape: maps a 3-level tree to the legacy category/subcategory/product shape', () => {
  const tree = attachVariantsToTree(
    buildTree([
      { id: 1, name: 'Category', parentId: null },
      { id: 2, name: 'Subcategory', available: true, parentId: 1 },
      { id: 3, name: 'Product', sku: 'SKU-1', description: 'desc', parentId: 2 },
    ]),
    [{ id: 100, nodeId: 3 }]
  )
  const shape = toLegacyCategoryShape(tree)
  assert.equal(shape.length, 1)
  assert.equal(shape[0].name, 'Category')
  assert.equal(shape[0].subcategories[0].name, 'Subcategory')
  assert.equal(shape[0].subcategories[0].available, true)
  assert.equal(shape[0].subcategories[0].products[0].title, 'Product')
  assert.equal(shape[0].subcategories[0].products[0].sku, 'SKU-1')
  assert.deepEqual(shape[0].subcategories[0].products[0].variants.map((v) => v.id), [100])
})

test('toLegacyCategoryShape: a variant attached directly to the root category still appears', () => {
  const tree = attachVariantsToTree(
    buildTree([{ id: 1, name: 'Category', parentId: null }]),
    [{ id: 200, nodeId: 1 }]
  )
  const shape = toLegacyCategoryShape(tree)
  assert.deepEqual(shape[0].variants.map((v) => v.id), [200])
  assert.deepEqual(shape[0].subcategories, [])
})

test('toLegacyCategoryShape: a 4th level of nesting is omitted, not crashed on or merged', () => {
  const tree = attachVariantsToTree(
    buildTree([
      { id: 1, name: 'Category', parentId: null },
      { id: 2, name: 'Subcategory', parentId: 1 },
      { id: 3, name: 'Product', parentId: 2 },
      { id: 4, name: 'TooDeep', parentId: 3 },
    ]),
    [{ id: 300, nodeId: 4 }]
  )
  const shape = toLegacyCategoryShape(tree)
  const product = shape[0].subcategories[0].products[0]
  assert.equal(product.title, 'Product')
  assert.equal('children' in product, false)
  // The variant attached at the 4th level has no slot in the legacy shape -
  // it is simply absent, not attributed to the wrong product.
  assert.deepEqual(product.variants, [])
})
```

- [ ] **Step 19: Run to confirm it fails, then implement**

Run: `node --test controller/catalogNodeTree.test.js` → FAIL.

Add to `controller/catalogNodeTree.js`:
```js
function toLegacyCategoryShape(tree) {
  return tree.map((category) => ({
    id: category.id,
    name: category.name,
    variants: category.variants ?? [],
    subcategories: (category.children ?? []).map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      available: subcategory.available ?? null,
      variants: subcategory.variants ?? [],
      products: (subcategory.children ?? []).map((product) => ({
        id: product.id,
        title: product.name,
        sku: product.sku ?? null,
        description: product.description ?? null,
        variants: product.variants ?? [],
      })),
    })),
  }))
}
```
Update `module.exports` to its final form:
```js
module.exports = {
  buildTree,
  ancestorChain,
  collectDescendantIds,
  attachVariantsToTree,
  resolveLegacyNodeKey,
  toLegacyCategoryShape,
}
```

- [ ] **Step 20: Run to confirm it passes**

Run: `node --test controller/catalogNodeTree.test.js`
Expected: PASS (20 tests).

- [ ] **Step 21: Commit**

```bash
git add controller/catalogNodeTree.js controller/catalogNodeTree.test.js
git commit -m "Add pure catalog-node tree helpers (build, walk, reshape)"
```

---

### Task 3: `catalogNodeController` — read operations

**Files:**
- Create: `controller/catalogNodeController.js` (read half: `getTree`, `getNode`)

**Interfaces:**
- Consumes: `buildTree`, `ancestorChain`, `attachVariantsToTree` from `./catalogNodeTree` (Task 2); `CatalogNode`, `Variant` from `../db/models` (Task 1); `AppError` from `../utils/appError`.
- Produces: `getTree(): Promise<node[]>` (full tree, variants attached at every depth), `getNode(id): Promise<node & { ancestors: node[], children: node[], variants: variant[] }>`.

- [ ] **Step 1: Implement `getTree` and `getNode`**

No automated test for this step — both functions are thin Sequelize-fetch wrappers around the already-tested pure helpers from Task 2, with no branching logic of their own to unit-test in isolation from a real database. Verified manually in Step 2.

Create `controller/catalogNodeController.js`:
```js
const { CatalogNode, Variant } = require('../db/models')
const AppError = require('../utils/appError')
const { buildTree, ancestorChain, attachVariantsToTree } = require('./catalogNodeTree')

const getTree = async () => {
  const nodes = await CatalogNode.findAll({ raw: true })
  const variants = await Variant.findAll({
    raw: true,
    attributes: ['id', 'title', 'sku', 'nodeId'],
  })
  return attachVariantsToTree(buildTree(nodes), variants)
}

const getNode = async (id) => {
  const nodeId = parseInt(id)
  const nodes = await CatalogNode.findAll({ raw: true })
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) throw new AppError('Node not found', 404)

  const ancestors = ancestorChain(nodeId, nodes).slice(0, -1)
  const children = nodes.filter((n) => n.parentId === nodeId)
  const variants = await Variant.findAll({ where: { nodeId }, raw: true })

  return { ...node, ancestors, children, variants }
}

module.exports = { getTree, getNode }
```

- [ ] **Step 2: Verify manually against the dev server**

Run: `npm run dev`

Create a tiny node by hand to verify against (any existing admin session's cookie works, or use the `/admin/catalog-node` POST route once Task 5 is done — for now, verify with a direct DB insert or skip to Task 5 before doing this check; this step can be deferred and combined with Task 5's manual verification).

- [ ] **Step 3: Commit**

```bash
git add controller/catalogNodeController.js
git commit -m "Add catalogNodeController read operations (getTree, getNode)"
```

---

### Task 4: `catalogNodeController` — write operations

**Files:**
- Modify: `controller/catalogNodeController.js` (add `createNode`, `updateNode`, `deleteNode`, `attachNodeImage`, `reorderNodeImages`)
- Create: `controller/catalogNodeController.test.js` (the one piece of write-side logic that has no DB dependency: the field-whitelist picker)

**Interfaces:**
- Consumes: `collectDescendantIds` from `./catalogNodeTree` (Task 2); `CatalogNode`, `CatalogNodeImages`, `Variant` from `../db/models`; `sequelize` from `../db/index.js`; `Op` from `sequelize`.
- Produces: `createNode(data): Promise<CatalogNode>`, `updateNode(id, data): Promise<{success, id}>`, `deleteNode(id): Promise<{success, deletedNodeIds}>`, `attachNodeImage(nodeId, imageId): Promise<CatalogNodeImages>`, `reorderNodeImages(nodeId, images): Promise<{success, message}>`.

- [ ] **Step 1: Write the failing test for the field whitelist**

Create `controller/catalogNodeController.test.js`:
```js
const test = require('node:test')
const assert = require('node:assert/strict')
const { pickNodeFields } = require('./catalogNodeController')

test('pickNodeFields: only known CatalogNode fields pass through', () => {
  const result = pickNodeFields({ name: 'X', notARealField: 'y', parentId: 3 })
  assert.deepEqual(result, { name: 'X', parentId: 3 })
})

test('pickNodeFields: omits keys that are undefined, keeps explicit null', () => {
  const result = pickNodeFields({ name: 'X', description: undefined, available: null })
  assert.deepEqual(result, { name: 'X', available: null })
})
```

- [ ] **Step 2: Run to confirm it fails**

Run: `node --test controller/catalogNodeController.test.js`
Expected: FAIL — `pickNodeFields` is not exported.

- [ ] **Step 3: Implement the write operations**

Replace the contents of `controller/catalogNodeController.js` with:
```js
const { Op } = require('sequelize')
const { CatalogNode, CatalogNodeImages, Variant } = require('../db/models')
const { sequelize } = require('../db/index.js')
const AppError = require('../utils/appError')
const { buildTree, ancestorChain, collectDescendantIds, attachVariantsToTree } = require('./catalogNodeTree')

const getTree = async () => {
  const nodes = await CatalogNode.findAll({ raw: true })
  const variants = await Variant.findAll({
    raw: true,
    attributes: ['id', 'title', 'sku', 'nodeId'],
  })
  return attachVariantsToTree(buildTree(nodes), variants)
}

const getNode = async (id) => {
  const nodeId = parseInt(id)
  const nodes = await CatalogNode.findAll({ raw: true })
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) throw new AppError('Node not found', 404)

  const ancestors = ancestorChain(nodeId, nodes).slice(0, -1)
  const children = nodes.filter((n) => n.parentId === nodeId)
  const variants = await Variant.findAll({ where: { nodeId }, raw: true })

  return { ...node, ancestors, children, variants }
}

const NODE_FIELDS = [
  'name',
  'description',
  'sku',
  'available',
  'stockLevel',
  'stockAlertLevel',
  'extradata',
  'parentId',
]

function pickNodeFields(data) {
  const fields = {}
  for (const key of NODE_FIELDS) {
    if (data[key] !== undefined) fields[key] = data[key]
  }
  return fields
}

const createNode = async (data) => {
  const fields = pickNodeFields(data)
  if (!fields.name) throw new AppError('name is required', 400)
  return await CatalogNode.create(fields)
}

const updateNode = async (id, data) => {
  const nodeId = parseInt(id)
  const fields = pickNodeFields(data)

  if (fields.parentId !== undefined && fields.parentId !== null) {
    const nodes = await CatalogNode.findAll({ raw: true })
    const descendantIds = collectDescendantIds(nodes, nodeId)
    if (descendantIds.includes(fields.parentId)) {
      throw new AppError('A node cannot be moved under itself or one of its own descendants', 400)
    }
  }

  await CatalogNode.update(fields, { where: { id: nodeId } })
  return { success: true, id: nodeId }
}

const deleteNode = async (id) => {
  const nodeId = parseInt(id)
  const nodes = await CatalogNode.findAll({ raw: true })
  const idsToDelete = collectDescendantIds(nodes, nodeId)

  return await sequelize.transaction(async (t) => {
    await Variant.destroy({ where: { nodeId: { [Op.in]: idsToDelete } }, transaction: t })
    await CatalogNodeImages.destroy({ where: { nodeId: { [Op.in]: idsToDelete } }, transaction: t })
    await CatalogNode.destroy({ where: { id: { [Op.in]: idsToDelete } }, transaction: t })
    return { success: true, deletedNodeIds: idsToDelete }
  })
}

const attachNodeImage = async (nodeId, imageId) => {
  const existingCount = await CatalogNodeImages.count({ where: { nodeId: parseInt(nodeId) } })
  return await CatalogNodeImages.create({
    nodeId: parseInt(nodeId),
    imageId: parseInt(imageId),
    position: existingCount,
  })
}

const reorderNodeImages = async (nodeId, images) => {
  const positions = images.map((img) => img.position)
  const uniquePositions = new Set(positions)
  if (positions.length !== uniquePositions.size) {
    throw new AppError('Duplicate position values found. Each image must have a unique position.', 400)
  }

  const existingAssociations = await CatalogNodeImages.findAll({
    where: {
      nodeId: parseInt(nodeId),
      imageId: images.map((img) => img.imageId),
    },
  })

  if (existingAssociations.length !== images.length) {
    throw new AppError('One or more images are not associated with this node', 400)
  }

  await sequelize.transaction(async (t) => {
    for (const img of images) {
      await CatalogNodeImages.update(
        { position: img.position },
        { where: { nodeId: parseInt(nodeId), imageId: img.imageId }, transaction: t }
      )
    }
  })

  return { success: true, message: 'Node images reordered successfully' }
}

module.exports = {
  getTree,
  getNode,
  createNode,
  updateNode,
  deleteNode,
  attachNodeImage,
  reorderNodeImages,
  pickNodeFields,
}
```

- [ ] **Step 4: Run to confirm the whitelist test passes**

Run: `node --test controller/catalogNodeController.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add controller/catalogNodeController.js controller/catalogNodeController.test.js
git commit -m "Add catalogNodeController write operations (create/update/delete/images)"
```

---

### Task 5: Routes — public `/catalog-node` and admin `/admin/catalog-node`

**Files:**
- Create: `routes/catalogNodeRouter.js`
- Modify: `routes/index.js:28` (add require), `routes/index.js:51` (mount, right after `/category`)
- Modify: `routes/adminRouter.js:2` (add require), insert new routes after the existing product block (after `routes/adminRouter.js:388`, before `// GET VARIANTS`)

**Interfaces:**
- Consumes: `getTree`, `getNode`, `createNode`, `updateNode`, `deleteNode`, `attachNodeImage`, `reorderNodeImages` from `../controller/catalogNodeController` (Task 3+4).
- Produces: live HTTP routes — `GET /catalog-node`, `GET /catalog-node/:id` (public); `GET/POST/PUT/DELETE /admin/catalog-node[/:id]`, `POST /admin/catalog-node/:id/images`, `POST /admin/catalog-node/:id/images/reorder` (admin-gated).

- [ ] **Step 1: Create the public router**

Create `routes/catalogNodeRouter.js`:
```js
const router = (module.exports = require('express').Router())
const { getTree, getNode } = require('../controller/catalogNodeController')

// GET /api/catalog-node
router.get('/', async (req, res, next) => {
  try {
    const data = await getTree()
    res.status(200).send(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/catalog-node/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const data = await getNode(id)
    res.status(200).send(data)
  } catch (error) {
    next(error)
  }
})
```

- [ ] **Step 2: Mount it in `routes/index.js`**

After `const categoryRouter = require('./categoryRouter');` (`routes/index.js:11`), add:
```js
const catalogNodeRouter = require('./catalogNodeRouter');
```

After `api.use('/category',  categoryRouter)` (`routes/index.js:51`), add:
```js
api.use('/catalog-node', catalogNodeRouter)
```

- [ ] **Step 3: Add the admin routes**

In `routes/adminRouter.js`, after the existing destructured import on line 2, add:
```js
const {
	getTree: getCatalogNodeTree,
	getNode: getCatalogNode,
	createNode: createCatalogNode,
	updateNode: updateCatalogNode,
	deleteNode: deleteCatalogNode,
	attachNodeImage,
	reorderNodeImages,
} = require('../controller/catalogNodeController')
```

Immediately after the existing `// DELETE /api/admin/product/` block (`routes/adminRouter.js:377-388`), and before the `// GET VARIANTS` comment (`routes/adminRouter.js:390`), add:
```js
// GET /api/admin/catalog-node
router.get('/catalog-node', async (req, res, next) => {
	try {
		const data = await getCatalogNodeTree()
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// GET /api/admin/catalog-node/:id
router.get('/catalog-node/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await getCatalogNode(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/catalog-node
router.post('/catalog-node', async (req, res, next) => {
	try {
		const data = await createCatalogNode(req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// PUT /api/admin/catalog-node/:id
router.put('/catalog-node/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await updateCatalogNode(id, req.body)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// DELETE /api/admin/catalog-node/:id
router.delete('/catalog-node/:id', async (req, res, next) => {
	try {
		const { id } = req.params
		const data = await deleteCatalogNode(id)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/catalog-node/:id/images
router.post('/catalog-node/:id/images', async (req, res, next) => {
	try {
		const { id } = req.params
		const { imageId } = req.body
		if (!imageId) throw new AppError('imageId is required', 400)
		const data = await attachNodeImage(id, imageId)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

// POST /api/admin/catalog-node/:id/images/reorder
router.post('/catalog-node/:id/images/reorder', async (req, res, next) => {
	try {
		const { id } = req.params
		const { images } = req.body
		if (!images || !Array.isArray(images)) {
			throw new AppError('Images array is required', 400)
		}
		const data = await reorderNodeImages(id, images)
		res.status(200).send(data)
	} catch (error) {
		next(error)
	}
})

```

- [ ] **Step 4: Verify manually against the dev server**

Run: `npm run dev`

Then, from another terminal (replace `<admin-cookie>` with a real logged-in admin session cookie — check `ESK_ADMIN`'s browser devtools, or skip the `/admin/*` calls and only check the public ones if no admin session is handy):

```bash
# Create a root node
curl -s -X POST http://localhost:<port>/api/admin/catalog-node \
  -H "Content-Type: application/json" -H "Cookie: <admin-cookie>" \
  -d '{"name":"Test Root"}'
# Expect: 200, JSON body with an "id" and "name":"Test Root"

# Create a child of it (replace 123 with the id returned above)
curl -s -X POST http://localhost:<port>/api/admin/catalog-node \
  -H "Content-Type: application/json" -H "Cookie: <admin-cookie>" \
  -d '{"name":"Test Child","parentId":123}'

# Public tree read
curl -s http://localhost:<port>/api/catalog-node
# Expect: 200, JSON array containing "Test Root" with "Test Child" nested in its children

# Try to move the root under its own child (should fail with 400)
curl -s -X PUT http://localhost:<port>/api/admin/catalog-node/123 \
  -H "Content-Type: application/json" -H "Cookie: <admin-cookie>" \
  -d '{"parentId":<child-id>}'
# Expect: 400, "A node cannot be moved under itself or one of its own descendants"

# Delete the root (should cascade to the child)
curl -s -X DELETE http://localhost:<port>/api/admin/catalog-node/123 \
  -H "Cookie: <admin-cookie>"
# Expect: 200, { "success": true, "deletedNodeIds": [123, <child-id>] }

curl -s http://localhost:<port>/api/catalog-node
# Expect: "Test Root" and "Test Child" both gone
```

- [ ] **Step 5: Commit**

```bash
git add routes/catalogNodeRouter.js routes/index.js routes/adminRouter.js
git commit -m "Mount /catalog-node (public) and /admin/catalog-node (admin CRUD) routes"
```

---

### Task 6: Backfill script (dry run by default)

**Files:**
- Create: `scripts/backfillCatalogNode.js`

**Interfaces:**
- Consumes: `resolveLegacyNodeKey` from `../controller/catalogNodeTree` (Task 2); `Category`, `Subcategory`, `Product`, `Variant`, `SubcategoryImages`, `ProductImages`, `CatalogNode`, `CatalogNodeImages` from `../db/models`; `sequelize` from `../db/index.js`.
- Produces: a standalone script, not a module — run with `node scripts/backfillCatalogNode.js` (dry run, read-only) or `node scripts/backfillCatalogNode.js --apply` (writes).

- [ ] **Step 1: Implement the script**

Create `scripts/backfillCatalogNode.js`:
```js
#!/usr/bin/env node
// One-time backfill: Category/Subcategory/Product -> catalog_node,
// Variant.categoryId/subcategoryId/productId -> Variant.nodeId.
// Defaults to a dry run (report only, no writes). Pass --apply to write.
// See docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md.

const { sequelize } = require('../db/index.js')
const {
  Category,
  Subcategory,
  Product,
  Variant,
  SubcategoryImages,
  ProductImages,
  CatalogNode,
  CatalogNodeImages,
} = require('../db/models')
const { resolveLegacyNodeKey } = require('../controller/catalogNodeTree')

const APPLY = process.argv.includes('--apply')

async function run() {
  const categories = await Category.findAll({ raw: true })
  const subcategories = await Subcategory.findAll({ raw: true })
  const products = await Product.findAll({ raw: true })
  const variants = await Variant.findAll({ raw: true })
  const subcategoryImages = await SubcategoryImages.findAll({ raw: true })
  const productImages = await ProductImages.findAll({ raw: true })

  console.log(
    `Found ${categories.length} categories, ${subcategories.length} subcategories, ` +
      `${products.length} products, ${variants.length} variants.`
  )
  console.log(`Expected new catalog_node rows: ${categories.length + subcategories.length + products.length}`)

  if (!APPLY) {
    console.log('Dry run only - pass --apply to write. No changes made.')
    return
  }

  await sequelize.transaction(async (t) => {
    const categoryNodeIdByOldId = new Map()
    for (const category of categories) {
      const node = await CatalogNode.create({ name: category.name, parentId: null }, { transaction: t })
      categoryNodeIdByOldId.set(category.id, node.id)
    }

    const subcategoryNodeIdByOldId = new Map()
    for (const subcategory of subcategories) {
      const parentNodeId = categoryNodeIdByOldId.get(subcategory.categoryId)
      const node = await CatalogNode.create(
        { name: subcategory.name, available: subcategory.available, parentId: parentNodeId },
        { transaction: t }
      )
      subcategoryNodeIdByOldId.set(subcategory.id, node.id)
    }

    const productNodeIdByOldId = new Map()
    for (const product of products) {
      const parentNodeId = subcategoryNodeIdByOldId.get(product.subcategoryId)
      const node = await CatalogNode.create(
        {
          name: product.title,
          description: product.description,
          sku: product.sku,
          available: product.available,
          stockLevel: product.stockLevel,
          stockAlertLevel: product.stockAlertLevel,
          extradata: product.extradata,
          parentId: parentNodeId,
        },
        { transaction: t }
      )
      productNodeIdByOldId.set(product.id, node.id)
    }

    for (const image of subcategoryImages) {
      const nodeId = subcategoryNodeIdByOldId.get(image.subcategoryId)
      if (nodeId == null) continue
      await CatalogNodeImages.create({ nodeId, imageId: image.imageId, position: image.position }, { transaction: t })
    }

    for (const image of productImages) {
      const nodeId = productNodeIdByOldId.get(image.productId)
      if (nodeId == null) continue
      await CatalogNodeImages.create({ nodeId, imageId: image.imageId, position: image.position }, { transaction: t })
    }

    let resolvedCount = 0
    let unresolvedCount = 0
    for (const variant of variants) {
      const key = resolveLegacyNodeKey(variant)
      if (!key) {
        unresolvedCount += 1
        continue
      }
      const nodeId =
        key.type === 'product'
          ? productNodeIdByOldId.get(key.legacyId)
          : key.type === 'subcategory'
          ? subcategoryNodeIdByOldId.get(key.legacyId)
          : categoryNodeIdByOldId.get(key.legacyId)
      if (nodeId == null) {
        unresolvedCount += 1
        continue
      }
      await Variant.update({ nodeId }, { where: { id: variant.id }, transaction: t })
      resolvedCount += 1
    }

    console.log(
      `Backfilled ${categoryNodeIdByOldId.size + subcategoryNodeIdByOldId.size + productNodeIdByOldId.size} catalog_node rows.`
    )
    console.log(`Resolved nodeId for ${resolvedCount} variants, ${unresolvedCount} left unresolved.`)
  })

  const nodeCount = await CatalogNode.count()
  const legacyCount = categories.length + subcategories.length + products.length
  console.log(
    nodeCount === legacyCount
      ? `OK: catalog_node count (${nodeCount}) matches legacy total (${legacyCount}).`
      : `MISMATCH: catalog_node count (${nodeCount}) != legacy total (${legacyCount}).`
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

- [ ] **Step 2: Run the dry run against the configured database**

Run: `node scripts/backfillCatalogNode.js`
Expected: prints the found counts and "Dry run only - pass --apply to write. No changes made." Confirm no new rows were written: `SELECT count(*) FROM catalog_node;` should still be whatever it was before this step (0, if Task 5's manual verification cleaned up after itself).

- [ ] **Step 3: Commit**

```bash
git add scripts/backfillCatalogNode.js
git commit -m "Add catalog_node backfill script (dry run by default)"
```

**Do not run `node scripts/backfillCatalogNode.js --apply` as part of this task.** Writing real data from the legacy tables into `catalog_node` for the live configured database is a separate, explicitly-approved step — raise it with the user once Tasks 1–7 are implemented and ask before running it for real.

---

### Task 7: Legacy `/category` compatibility shim

**Files:**
- Modify: `controller/categoryController.js:5-52` (replace `getCategories`'s implementation only)

**Interfaces:**
- Consumes: `getTree` from `./catalogNodeController` (Task 3); `toLegacyCategoryShape` from `./catalogNodeTree` (Task 2).
- Produces: `getCategories()` — same external contract as today (no parameters, resolves to the legacy nested JSON array), new implementation.

**Prerequisite:** Task 6's backfill must have been run with `--apply` in this environment before this task's output is correct — until then, every `catalog_node` row has zero variants attached (because no `Variant.nodeId` has been populated yet), so this shim would make `GET /category` return every category/subcategory/product with empty variant arrays. Do not deploy this task ahead of a completed `--apply` backfill in the target environment.

- [ ] **Step 1: Replace `getCategories`**

In `controller/categoryController.js`, replace:
```js
const { Op } = require('sequelize')
const {Category, Subcategory, Product, SubcategoryImages, Image, ProductImages } = require('../db/models')
const Variant = require('../db/models/variant')

const getCategories = async () => {
  return await Category.findAll({
    attributes: ["id", "name"],
    include: [
      {
        model: Subcategory,
        include: [
          {
            model: SubcategoryImages,
            include: [{ model: Image }],
          },
          {
            model: Product,
            include: [
              {
                model: Variant,
                as: "variants",
                where: {},
                required: false,
              },
              {
                model: ProductImages,
                include: [ {model: Image}]
               }
            ],
          },
          {
            model: Variant,
            as: "variants",
            where: {
              productId: null,
            },
            required: false,
          },
        ],
      },
      {
        model: Variant,
        as: "variants",
        where: {
          subcategory_id: null,
          product_id: null,
        },
        required: false,
      },
    ],
  });
};
```
with:
```js
const { Op } = require('sequelize')
const {Category, Subcategory, Product, SubcategoryImages, Image, ProductImages } = require('../db/models')
const Variant = require('../db/models/variant')
const { getTree } = require('./catalogNodeController')
const { toLegacyCategoryShape } = require('./catalogNodeTree')

// Compatibility shim: ESK_FE_V2 calls GET /category directly and still
// expects this exact legacy shape. The real data now lives in catalog_node
// (see docs/superpowers/specs/2026-10-22-unlimited-catalog-hierarchy-design.md);
// this reshapes it back. Only works for trees up to 3 levels deep - a node
// nested deeper than Category -> Subcategory -> Product has no slot here
// and is simply omitted (toLegacyCategoryShape's own documented behavior).
const getCategories = async () => {
  const tree = await getTree()
  return toLegacyCategoryShape(tree)
}
```

Leave `getCategory`, `getCategoryByName`, `addCategory`, and `deleteCategory` in this file untouched — they still operate on the original `Category` table directly, which is unaffected by this plan.

- [ ] **Step 2: Verify manually against the dev server**

This step is only meaningful after Task 6's backfill has run with `--apply`. Once it has:

Run: `npm run dev`
```bash
curl -s http://localhost:<port>/api/category
```
Expected: 200, a JSON array shaped exactly like it is today (`{ id, name, subcategories: [{ id, name, ..., products: [...], variants: [...] }], variants: [...] }` per category) — compare a sample category's variant count against what the old implementation returned before this change, to confirm the reshape preserved the data.

- [ ] **Step 3: Commit**

```bash
git add controller/categoryController.js
git commit -m "Reshape GET /category from catalog_node, keeping the legacy response shape"
```
