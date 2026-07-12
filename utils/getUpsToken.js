const axios = require('axios')

async function getUpsToken() {
    const auth = Buffer.from(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`).toString('base64')

    try {
        const response = await axios.post(
            'https://wwwcie.ups.com/security/v1/oauth/token',
            'grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        return response.data.access_token
    } catch (err) {
        console.error('UPS token error:', err.response?.data || err.message)
        throw new Error('UPS authentication failed')
    }
}

module.exports = getUpsToken