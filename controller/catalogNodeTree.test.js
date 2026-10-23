const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildTree,
  ancestorChain,
  collectDescendantIds,
  attachVariantsToTree,
  attachImagesToTree,
  resolveLegacyNodeKey,
  toLegacyCategoryShape,
  toNodeId,
  toTitleCase,
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

test('buildTree: a two-node cycle promotes both nodes to roots, neither vanishes', () => {
  const nodes = [
    { id: 1, parentId: 2 },
    { id: 2, parentId: 1 },
    { id: 3, parentId: null },
  ]
  const tree = buildTree(nodes)
  assert.deepEqual(tree.map((n) => n.id).sort(), [1, 2, 3])
  // Neither cyclic node is nested inside the other.
  const one = tree.find((n) => n.id === 1)
  const two = tree.find((n) => n.id === 2)
  assert.deepEqual(one.children, [])
  assert.deepEqual(two.children, [])
})

test('buildTree: a three-node cycle promotes every member to root', () => {
  const nodes = [
    { id: 1, parentId: 2 },
    { id: 2, parentId: 3 },
    { id: 3, parentId: 1 },
  ]
  const tree = buildTree(nodes)
  assert.deepEqual(tree.map((n) => n.id).sort(), [1, 2, 3])
})

test('toNodeId: numeric string coerces to a number', () => {
  assert.equal(toNodeId('2'), 2)
})

test('toNodeId: a real number passes through', () => {
  assert.equal(toNodeId(2), 2)
})

test('toNodeId: a non-numeric string is invalid', () => {
  assert.equal(toNodeId('abc'), null)
})

test('toNodeId: null/undefined are invalid', () => {
  assert.equal(toNodeId(null), null)
  assert.equal(toNodeId(undefined), null)
})

test('attachImagesToTree: attaches images at every depth, ordered by position', () => {
  const tree = buildTree([
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
  ])
  const images = [
    { nodeId: 2, position: 1, image: { url: 'b.jpg' } },
    { nodeId: 2, position: 0, image: { url: 'a.jpg' } },
    { nodeId: 1, position: 0, image: { url: 'root.jpg' } },
  ]
  const result = attachImagesToTree(tree, images)
  assert.deepEqual(result[0].images.map((i) => i.image.url), ['root.jpg'])
  assert.deepEqual(result[0].children[0].images.map((i) => i.image.url), ['a.jpg', 'b.jpg'])
})

test('attachImagesToTree: a node with no images gets an empty array, not undefined', () => {
  const tree = buildTree([{ id: 1, parentId: null }])
  const result = attachImagesToTree(tree, [])
  assert.deepEqual(result[0].images, [])
})

test('toLegacyCategoryShape: emits subcategory_images and product_images from attached images', () => {
  let tree = buildTree([
    { id: 1, name: 'Category', parentId: null },
    { id: 2, name: 'Subcategory', parentId: 1 },
    { id: 3, name: 'Product', parentId: 2 },
  ])
  tree = attachVariantsToTree(tree, [])
  tree = attachImagesToTree(tree, [
    { nodeId: 2, position: 0, image: { url: 'sub.jpg' } },
    { nodeId: 3, position: 0, image: { url: 'prod.jpg' } },
  ])
  const shape = toLegacyCategoryShape(tree)
  const subcategory = shape[0].subcategories[0]
  assert.deepEqual(subcategory.subcategory_images.map((i) => i.image.url), ['sub.jpg'])
  assert.deepEqual(subcategory.products[0].product_images.map((i) => i.image.url), ['prod.jpg'])
})

test('toLegacyCategoryShape: a node with no images emits an empty image array, not a missing key', () => {
  let tree = buildTree([
    { id: 1, name: 'Category', parentId: null },
    { id: 2, name: 'Subcategory', parentId: 1 },
  ])
  tree = attachVariantsToTree(tree, [])
  tree = attachImagesToTree(tree, [])
  const shape = toLegacyCategoryShape(tree)
  assert.deepEqual(shape[0].subcategories[0].subcategory_images, [])
})

test('toTitleCase: lowercase words become capitalized, rest lowercased', () => {
  assert.equal(toTitleCase('ambalaj malzemeleri'), 'Ambalaj Malzemeleri')
})

test('toTitleCase: all-caps input is normalized the same way', () => {
  // No "I" in this example deliberately - Turkish lowercasing of a plain
  // ASCII "I" is genuinely ambiguous (it could have been typed for dotted
  // "i" or dotless "ı"; ASCII capitals can't tell them apart, and Turkish
  // locale rules correctly resolve plain "I" to dotless "ı", which is why
  // "MALZEMELERI" normalizes to "Malzemelerı", not back to "Malzemeleri" -
  // not a bug, an inherent property of the input). See the dedicated
  // dotted/dotless test below for the unambiguous (lowercase-input) case.
  assert.equal(toTitleCase('AMBALAJ KUTUSU'), 'Ambalaj Kutusu')
})

test('toTitleCase: hyphens and slashes are preserved as separators, not removed', () => {
  assert.equal(toTitleCase('ambalaj-malzemeleri/kutu'), 'Ambalaj-Malzemeleri/Kutu')
})

test('toTitleCase: double quotes are preserved in place', () => {
  assert.equal(toTitleCase('cord strap "heavy duty"'), 'Cord Strap "Heavy Duty"')
})

test('toTitleCase: Turkish dotted/dotless i is capitalized correctly, not with the ASCII rule', () => {
  // "istanbul" capitalizes to "İstanbul" (dotted İ) in Turkish, not the
  // ASCII "Istanbul" a locale-insensitive toUpperCase() would produce.
  assert.equal(toTitleCase('istanbul'), 'İstanbul')
})

test('toTitleCase: a single already-capitalized word is left alone', () => {
  assert.equal(toTitleCase('Kutu'), 'Kutu')
})
