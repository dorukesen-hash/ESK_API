const test = require('node:test')
const assert = require('node:assert/strict')
const { Op } = require('sequelize')
const { normalizeGuestLookupEmail, buildGuestLookupWhere } = require('./orderController')

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

// This is the single clause standing between the guest lookup endpoint and
// full order enumeration (anyone able to read every order by cycling
// orderNumber, or by pairing a guessed orderNumber with a random email and
// getting someone else's order back). Pulled out as a pure function so that
// guarantee has a regression test that needs no database - a `[Op.and]: [...]`
// silently "simplified" to `[Op.or]`, or an orderNumber branch that
// short-circuits the email check, fails this test immediately.
test('buildGuestLookupWhere: email alone produces exactly one AND condition', () => {
  const where = buildGuestLookupWhere({ email: 'Jane@Example.com' })
  assert.ok(Op.and in where)
  assert.ok(!(Op.or in where))
  assert.equal(where[Op.and].length, 1)
})

test('buildGuestLookupWhere: email + orderNumber are ANDed together, not ORed - a wrong-email guess can never pair with a real orderNumber to return someone else\'s order', () => {
  const where = buildGuestLookupWhere({ email: 'jane@example.com', orderNumber: '1001' })
  assert.ok(Op.and in where)
  assert.ok(!(Op.or in where))
  assert.equal(where[Op.and].length, 2)
  assert.deepEqual(where[Op.and][1], { orderNumber: '1001' })
})

test('buildGuestLookupWhere: orderNumber is coerced to a trimmed string, not passed through as whatever the query string produced', () => {
  const where = buildGuestLookupWhere({ email: 'jane@example.com', orderNumber: '  1001  ' })
  assert.deepEqual(where[Op.and][1], { orderNumber: '1001' })
})

test('buildGuestLookupWhere: no orderNumber means no second condition at all - never a bypass for the email check', () => {
  const where = buildGuestLookupWhere({ email: 'jane@example.com', orderNumber: '' })
  assert.equal(where[Op.and].length, 1)
})
