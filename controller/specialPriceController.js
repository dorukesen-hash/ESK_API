const { SpecialPrices, Variant } = require('../db/models');
const AppError = require('../utils/appError');
const { logSpecialPriceChange } = require('./pricingAuditController');

const getSpecialPricesForUser = async (userId) => {
    return await SpecialPrices.findAll({
        where: { userId },
        include: [{ model: Variant, attributes: ['id', 'title', 'stock'] }],
        order: [['id', 'ASC']],
    });
};

// One override row per (user, variant) - re-setting an existing override
// updates it in place rather than creating a duplicate.
const upsertSpecialPrice = async ({ userId, variantId, price, actorUserId }) => {
    if (!userId || !variantId) throw new AppError('userId and variantId are required.', 400);
    if (price === undefined || price === null || isNaN(parseFloat(price))) {
        throw new AppError('A valid price is required.', 400);
    }

    const existing = await SpecialPrices.findOne({ where: { userId, variantId } });
    if (existing) {
        const oldPrice = existing.price;
        existing.price = price;
        await existing.save();
        await logSpecialPriceChange({
            targetUserId: userId, actorUserId, variantId, action: 'update', oldValue: oldPrice, newValue: price,
        });
        return existing;
    }
    const created = await SpecialPrices.create({ userId, variantId, price });
    await logSpecialPriceChange({
        targetUserId: userId, actorUserId, variantId, action: 'create', oldValue: null, newValue: price,
    });
    return created;
};

const deleteSpecialPrice = async (id, actorUserId) => {
    const existing = await SpecialPrices.findByPk(id);
    if (!existing) return 0;
    const result = await SpecialPrices.destroy({ where: { id } });
    await logSpecialPriceChange({
        targetUserId: existing.userId, actorUserId, variantId: existing.variantId, action: 'delete', oldValue: existing.price, newValue: null,
    });
    return result;
};

module.exports = {
    getSpecialPricesForUser,
    upsertSpecialPrice,
    deleteSpecialPrice,
};
