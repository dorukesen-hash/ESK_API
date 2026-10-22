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

module.exports = {
  buildTree,
  ancestorChain,
  collectDescendantIds,
  attachVariantsToTree,
  resolveLegacyNodeKey,
  toLegacyCategoryShape,
}
