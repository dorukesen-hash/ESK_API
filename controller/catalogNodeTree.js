// Walking from `parentId` up the (pre-fix) parentId chain, does it ever
// reach back to `nodeId` itself? If so, attaching `nodeId` under `parentId`
// would create a cycle. `seen` stops on a cycle that doesn't involve
// `nodeId` at all (a different pair cycling with each other) rather than
// looping forever.
function hasAncestorCycle(byId, nodeId, parentId) {
  let current = parentId
  const seen = new Set()
  while (current != null) {
    if (current === nodeId) return true
    if (seen.has(current)) return false
    seen.add(current)
    const parentNode = byId.get(current)
    current = parentNode ? parentNode.parentId : null
  }
  return false
}

function buildTree(nodes) {
  const byId = new Map()
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] })
  }

  const roots = []
  for (const node of byId.values()) {
    const hasValidParent =
      node.parentId != null &&
      node.parentId !== node.id &&
      byId.has(node.parentId) &&
      !hasAncestorCycle(byId, node.id, node.parentId)
    if (hasValidParent) {
      byId.get(node.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

// A tiny amount of input validation that belongs next to the tree algebra:
// callers that accept a parentId from an HTTP body (a string, by the time
// it reaches here if the client sent form-encoded data) must normalize
// before comparing it against a list of numeric ids, or a cycle guard that
// looks correct silently never fires.
function toNodeId(value) {
  if (value == null) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

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

function attachImagesToTree(tree, images) {
  const imagesByNodeId = new Map()
  for (const image of images) {
    if (!imagesByNodeId.has(image.nodeId)) imagesByNodeId.set(image.nodeId, [])
    imagesByNodeId.get(image.nodeId).push(image)
  }
  for (const list of imagesByNodeId.values()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }

  function attach(node) {
    return {
      ...node,
      images: imagesByNodeId.get(node.id) ?? [],
      children: node.children.map(attach),
    }
  }

  return tree.map(attach)
}

function resolveLegacyNodeKey(variant) {
  if (variant.productId != null) return { type: 'product', legacyId: variant.productId }
  if (variant.subcategoryId != null) return { type: 'subcategory', legacyId: variant.subcategoryId }
  if (variant.categoryId != null) return { type: 'category', legacyId: variant.categoryId }
  return null
}

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
      subcategory_images: subcategory.images ?? [],
      products: (subcategory.children ?? []).map((product) => ({
        id: product.id,
        title: product.name,
        sku: product.sku ?? null,
        description: product.description ?? null,
        variants: product.variants ?? [],
        product_images: product.images ?? [],
      })),
    })),
  }))
}

// Normalizes a node name to Title Case: the first letter of each word
// capitalized, the rest lowercased, with whitespace/-/ /" left exactly where
// they were (so they act as word separators without being removed). Turkish-
// locale-aware ('tr') on purpose - a locale-insensitive toUpperCase/
// toLowerCase gets "i"/"I" wrong for Turkish text (e.g. capitalizing
// "istanbul" must produce the dotted "İstanbul", not the ASCII "Istanbul").
// Each word is lowercased in full BEFORE capitalizing its first letter
// (rather than upper-casing the already-cased first letter in place) so
// mixed/garbled input ("AMBALAJ", "aMBALAJ") normalizes the same way a
// properly-typed word would.
function toTitleCase(str) {
  return str.replace(/[^\s\-/"]+/g, (word) => {
    const lower = word.toLocaleLowerCase('tr')
    return lower.charAt(0).toLocaleUpperCase('tr') + lower.slice(1)
  })
}

module.exports = {
  buildTree,
  ancestorChain,
  collectDescendantIds,
  attachVariantsToTree,
  attachImagesToTree,
  resolveLegacyNodeKey,
  toLegacyCategoryShape,
  toNodeId,
  toTitleCase,
}
