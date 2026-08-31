const models = require('../db/models');
const { DiscountCode, DiscountCodeRedemption, User, Order } = models;
const AppError = require('../utils/appError');
const { resolveOrderPricing } = require('../utils/pricing');

const getDiscountCodes = async () => {
    return await DiscountCode.findAll({ order: [['id', 'DESC']] });
};

const normalizePayload = (data) => {
    const { code, type, value, minOrderAmount, validFrom, validUntil, maxUses, maxUsesPerCustomer, isActive, firstOrderOnly } = data;

    if (!code || !String(code).trim()) throw new AppError('Code is required.', 400);
    if (type !== 'percent' && type !== 'fixed') throw new AppError("Type must be 'percent' or 'fixed'.", 400);
    if (value === undefined || value === null || isNaN(parseFloat(value))) {
        throw new AppError('A valid value is required.', 400);
    }
    if (type === 'percent' && (parseFloat(value) <= 0 || parseFloat(value) > 100)) {
        throw new AppError('Percent value must be between 0 and 100.', 400);
    }

    return {
        code: String(code).trim().toUpperCase(),
        type,
        value: parseFloat(value),
        minOrderAmount: minOrderAmount === '' || minOrderAmount == null ? null : parseFloat(minOrderAmount),
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        maxUses: maxUses === '' || maxUses == null ? null : parseInt(maxUses, 10),
        maxUsesPerCustomer: maxUsesPerCustomer === '' || maxUsesPerCustomer == null ? null : parseInt(maxUsesPerCustomer, 10),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        firstOrderOnly: Boolean(firstOrderOnly),
    };
};

const createDiscountCode = async (data) => {
    const payload = normalizePayload(data);

    const existing = await DiscountCode.findOne({ where: { code: payload.code } });
    if (existing) throw new AppError('A discount code with this code already exists.', 400);

    return await DiscountCode.create(payload);
};

const updateDiscountCode = async (id, data) => {
    const row = await DiscountCode.findByPk(id);
    if (!row) throw new AppError('Discount code not found.', 404);

    const payload = normalizePayload({ ...row.toJSON(), ...data });

    if (payload.code !== row.code) {
        const existing = await DiscountCode.findOne({ where: { code: payload.code } });
        if (existing) throw new AppError('A discount code with this code already exists.', 400);
    }

    await row.update(payload);
    return row;
};

const deleteDiscountCode = async (id) => {
    return await DiscountCode.destroy({ where: { id } });
};

// Redemption history for one code - who used it and on which order.
const getDiscountCodeRedemptions = async (id) => {
    return await DiscountCodeRedemption.findAll({
        where: { discountCodeId: id },
        include: [
            { model: User, attributes: ['id', 'name', 'surname', 'email'] },
            { model: Order, attributes: ['id', 'orderNumber'] },
        ],
        order: [['id', 'DESC']],
    });
};

// Public preview for the cart page's coupon input - validates a customer-
// typed code against their real cart contents and tells them whether it
// applied, without creating a Stripe PaymentIntent. Uses the exact same
// resolveOrderPricing() that create-payment-intent/createOrder use, so the
// preview can never promise a discount that checkout won't actually give.
const previewDiscountCode = async (data, reqUser) => {
    const { items, discountCode } = data;
    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Cart is empty.', 400);
    }
    if (!discountCode) {
        throw new AppError('No discount code provided.', 400);
    }

    const user = reqUser?.id ? await User.findByPk(reqUser.id) : null;
    const result = await resolveOrderPricing({ items, user, discountCode, models });

    if (!result.validatedDiscountCode) {
        throw new AppError('Invalid discount code.', 400);
    }

    return {
        code: result.validatedDiscountCode.code,
        type: result.validatedDiscountCode.type,
        value: result.validatedDiscountCode.value,
        applied: Boolean(result.appliedDiscountCode),
        discountAmount: result.appliedDiscountCode ? result.discountAmount : 0,
        message: result.appliedDiscountCode
            ? null
            : 'This code is valid, but your existing discount already gives you a better price.',
    };
};

module.exports = {
    getDiscountCodes,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
    getDiscountCodeRedemptions,
    previewDiscountCode,
};
