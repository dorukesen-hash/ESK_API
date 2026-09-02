// UPS_BASE_URL lets a deploy pin to UPS's CIE/test host for local dev
// (https://wwwcie.ups.com); production is the default now that real UPS
// production credentials are in use - see UPS_CLIENT_ID/UPS_CLIENT_SECRET/
// UPS_ACCOUNT_NUMBER in .env.
const getUpsBaseUrl = () => process.env.UPS_BASE_URL || 'https://onlinetools.ups.com';

module.exports = { getUpsBaseUrl };
