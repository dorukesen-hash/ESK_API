const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeGuestLookupEmail } = require('./orderController')

test('normalizeGuestLookupEmail: trims and lowercases', () => {
  assert.equal(normalizeGuestLookupEmail('  Jane@Example.COM  '), 'jane@example.com')
})

test('normalizeGuestLookupEmail: throws a 400-shaped error on an empty string', () => {
  assert.throws(() => normalizeGuestLookupEmail(''), (error) => {
    assert.equal(error.statusCode, 400)
    assert.equal(error.isOperational, true)
    assert.equal(error.status, 'fail')
    return true
  })
})

test('normalizeGuestLookupEmail: throws the same way on undefined', () => {
  assert.throws(() => normalizeGuestLookupEmail(undefined), (error) => {
    assert.equal(error.statusCode, 400)
    return true
  })
})

test('normalizeGuestLookupEmail: whitespace-only input throws too', () => {
  assert.throws(() => normalizeGuestLookupEmail('   '), (error) => {
    assert.equal(error.statusCode, 400)
    return true
  })
})
