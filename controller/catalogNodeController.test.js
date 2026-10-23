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
