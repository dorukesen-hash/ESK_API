const { SpecialPrices } = require('../db/models');

// Mirrors ESK_FE's hooks/service.js calculatePrice() tier selection, but
// checked high-to-low - the FE version's `quantity > 4` branch runs before
// its `quantity > 9` branch, so 10+ unit orders are silently billed at the
// five_nine_units rate there. Fixed here since this becomes the source of
// truth for stored order prices.
const resolveTierPrice = (variant, quantity) => {
    if (quantity >= 10) return variant.ten_plus_units;
    if (quantity >= 5) return variant.five_nine_units;
    return variant.one_four_units;
};

// Per-customer pricing, in priority order:
//   1. A SpecialPrices row for this (user, variant) - a flat override price,
//      quantity-independent, set by an admin for this specific customer.
//   2. Otherwise the normal quantity-tiered price, with the user's blanket
//      discountPercent (if any) applied on top.
//   3. Guests / users with neither just get the plain tiered price.
const resolveVariantPrice = async (variant, quantity, user) => {
    if (user) {
        const override = await SpecialPrices.findOne({
            where: { userId: user.id, variantId: variant.id },
        });
        if (override && override.price != null) {
            return parseFloat(override.price);
        }
    }

    const tierPrice = resolveTierPrice(variant, quantity);
    if (tierPrice == null) return tierPrice;
    let price = parseFloat(tierPrice);

    const pct = user?.discountPercent != null ? parseFloat(user.discountPercent) : 0;
    if (pct > 0) {
        price = price * (1 - pct / 100);
    }

    return price;
};

// Attached to variant responses (GET /variant/:id, POST /variant/id-list) so
// the storefront can show/submit the correct per-customer price BEFORE
// checkout, instead of only finding out at order-creation time. `null` when
// there's no logged-in user - FE falls back to plain tiered pricing.
const getPricingOverrideInfo = async (variant, user) => {
    if (!user) return null;

    const override = await SpecialPrices.findOne({
        where: { userId: user.id, variantId: variant.id },
    });

    return {
        hasOverride: Boolean(override),
        overridePrice: override && override.price != null ? parseFloat(override.price) : null,
        discountPercent: user.discountPercent != null ? parseFloat(user.discountPercent) : null,
    };
};

module.exports = { resolveVariantPrice, resolveTierPrice, getPricingOverrideInfo };
