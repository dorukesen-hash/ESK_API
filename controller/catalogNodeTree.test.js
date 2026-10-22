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
