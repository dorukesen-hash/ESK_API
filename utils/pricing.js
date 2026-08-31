const { SpecialPrices } = require('../db/models');
const AppError = require('./appError');

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
//      discountPercent (if any) applied on top - unless skipUserDiscount is
//      passed (used to compute the "no blanket discount" comparison subtotal
//      for discount codes; see resolveOrderPricing).
//   3. Guests / users with neither just get the plain tiered price.
const resolveVariantPrice = async (variant, quantity, user, opts = {}) => {
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

    if (!opts.skipUserDiscount) {
        const pct = user?.discountPercent != null ? parseFloat(user.discountPercent) : 0;
        if (pct > 0) {
            price = price * (1 - pct / 100);
        }
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

// Validates a discount code against the given (pre-discount) items subtotal
// and customer. Throws AppError with a customer-facing message on any
// failure - callers decide whether that's fatal (a code the customer typed
// themselves) or should be swallowed (an auto-applied first-order code the
// customer never asked for).
const validateDiscountCode = async (rawCode, { subtotal, user, models }) => {
    const { DiscountCode, DiscountCodeRedemption, Order } = models;
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) throw new AppError('No discount code provided.', 400);

    const row = await DiscountCode.findOne({ where: { code } });
    if (!row) throw new AppError('Invalid discount code.', 400);
    if (!row.isActive) throw new AppError('This discount code is no longer active.', 400);

    const now = new Date();
    if (row.validFrom && now < new Date(row.validFrom)) {
        throw new AppError('This discount code is not yet valid.', 400);
    }
    if (row.validUntil && now > new Date(row.validUntil)) {
        throw new AppError('This discount code has expired.', 400);
    }
    if (row.minOrderAmount != null && subtotal < parseFloat(row.minOrderAmount)) {
        throw new AppError(`This code requires a minimum order of $${parseFloat(row.minOrderAmount).toFixed(2)}.`, 400);
    }
    if (row.maxUses != null && row.timesUsed >= row.maxUses) {
        throw new AppError('This discount code has reached its usage limit.', 400);
    }

    if (row.firstOrderOnly || row.maxUsesPerCustomer != null) {
        if (!user) throw new AppError('Please sign in to use this code.', 400);
    }
    if (row.firstOrderOnly) {
        const priorOrders = await Order.count({ where: { userId: user.id } });
        if (priorOrders > 0) throw new AppError('This code is only valid on your first order.', 400);
    }
    if (row.maxUsesPerCustomer != null) {
        const used = await DiscountCodeRedemption.count({ where: { discountCodeId: row.id, userId: user.id } });
        if (used >= row.maxUsesPerCustomer) {
            throw new AppError('You have already used this discount code the maximum number of times.', 400);
        }
    }

    return row;
};

const computeDiscountAmount = (discountCodeRow, subtotal) => {
    const amount = discountCodeRow.type === 'fixed'
        ? parseFloat(discountCodeRow.value)
        : subtotal * (parseFloat(discountCodeRow.value) / 100);
    return Math.max(0, Math.min(amount, subtotal));
};

// Single source of truth for "what does this cart's items subtotal cost,
// after whichever discount actually wins" - shared by create-payment-intent
// (to compute the Stripe charge) and createOrder (to compute and persist the
// stored order total), so the two can never drift apart.
//
// A discount code and the customer's blanket discountPercent don't stack -
// per user decision, whichever discount is larger wins for the whole order.
// If no code is explicitly given, an active firstOrderOnly code is tried
// automatically for logged-in users (the migrated "first order 10% off"),
// but silently skipped if the customer doesn't actually qualify - only an
// explicitly-typed code's validation failure is surfaced as an error.
const resolveOrderPricing = async ({ items, user, discountCode, models }) => {
    const { Variant } = models;

    let subtotalWithUserPct = 0;
    let subtotalNoPct = 0;
    for (const item of items) {
        const variant = await Variant.findByPk(item.variantId ?? item.id);
        if (!variant) {
            throw new AppError(`Variant ${item.variantId ?? item.id} not found.`, 400);
        }
        const withPct = await resolveVariantPrice(variant, item.quantity, user);
        const noPct = await resolveVariantPrice(variant, item.quantity, user, { skipUserDiscount: true });
        subtotalWithUserPct += (withPct || 0) * item.quantity;
        subtotalNoPct += (noPct || 0) * item.quantity;
    }

    const explicitCode = Boolean(discountCode);
    let codeToTry = discountCode || null;
    if (!codeToTry && user) {
        const auto = await models.DiscountCode.findOne({ where: { firstOrderOnly: true, isActive: true } });
        if (auto) codeToTry = auto.code;
    }

    let appliedDiscountCode = null;
    let subtotalWithCode = null;
    if (codeToTry) {
        try {
            const row = await validateDiscountCode(codeToTry, { subtotal: subtotalNoPct, user, models });
            appliedDiscountCode = row;
            subtotalWithCode = subtotalNoPct - computeDiscountAmount(row, subtotalNoPct);
        } catch (err) {
            if (explicitCode) throw err;
            // auto-applied code wasn't eligible - just fall back to normal pricing
        }
    }

    let subtotal = subtotalWithUserPct;
    let winningCode = null;
    if (appliedDiscountCode != null && subtotalWithCode < subtotal) {
        subtotal = subtotalWithCode;
        winningCode = appliedDiscountCode;
    }

    return {
        subtotal,
        // The code actually reflected in `subtotal` (null if the blanket
        // discountPercent won instead, or no code applied at all).
        appliedDiscountCode: winningCode,
        discountAmount: winningCode ? subtotalNoPct - subtotalWithCode : 0,
        // The code that passed validation, whether or not it ended up
        // winning against the blanket discount - lets a caller (e.g. the
        // cart page's coupon preview) tell the difference between "invalid
        // code" and "valid code, but your existing discount is already better".
        validatedDiscountCode: appliedDiscountCode,
    };
};

module.exports = {
    resolveVariantPrice,
    resolveTierPrice,
    getPricingOverrideInfo,
    validateDiscountCode,
    computeDiscountAmount,
    resolveOrderPricing,
};
