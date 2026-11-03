const test = require('node:test')
const assert = require('node:assert/strict')

// This app is deployed behind Railway's edge proxy (NEXT_PUBLIC_API_URL
// points at eskapi-production.up.railway.app) - every request Express
// actually sees arrives from that proxy's own address, not the real
// client's. Without `trust proxy` configured, express-rate-limit's
// default per-IP key resolves to that one shared proxy address for
// every visitor, so the /orders/lookup limiter throttles the whole site
// collectively (20 requests total, from anyone) instead of per client.
// Trusting exactly one proxy hop makes Express read the real client
// address from X-Forwarded-For instead.
test('app trusts exactly one proxy hop (Railway), so the rate limiter buckets by the real client, not the shared proxy address', async () => {
  const app = require('../app')
  const server = app.listen(0)
  const { port } = server.address()

  try {
    async function lookupAs(forwardedFor) {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/orders/lookup?email=trust-proxy-test@example.com`,
        { headers: { 'X-Forwarded-For': forwardedFor } }
      )
      return res.status
    }

    for (let i = 0; i < 20; i++) {
      await lookupAs('203.0.113.1')
    }
    const blockedForClientA = await lookupAs('203.0.113.1')
    const stillOkForClientB = await lookupAs('203.0.113.2')

    assert.equal(blockedForClientA, 429)
    assert.equal(stillOkForClientB, 200)
  } finally {
    server.close()
  }
})
