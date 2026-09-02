// UPS is rate-quote-only here (Taibeta is the actual primary shipping
// provider) - CIE/test host is the deliberate default for that. Set
// UPS_BASE_URL to https://onlinetools.ups.com only if UPS itself is ever
// used to actually ship (real labels), not just to price-compare.
const getUpsBaseUrl = () => process.env.UPS_BASE_URL || 'https://wwwcie.ups.com';

module.exports = { getUpsBaseUrl };
