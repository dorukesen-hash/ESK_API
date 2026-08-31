const { SpecialPrices, Variant } = require('../db/models');
const AppError = require('../utils/appError');

const getSpecialPricesForUser = async (userId) => {
    return await SpecialPrices.findAll({
        where: { userId },
        include: [{ model: Variant, attributes: ['id', 'title', 'stock'] }],
        order: [['id', 'ASC']],
    });
};

// One override row per (user, variant) - re-setting an existing override
// updates it in place rather than creating a duplicate.
const upsertSpecialPrice = async ({ userId, variantId, price }) => {
    if (!userId || !variantId) throw new AppError('userId and variantId are required.', 400);
    if (price === undefined || price === null || isNaN(parseFloat(price))) {
        throw new AppError('A valid price is required.', 400);
    }

    const existing = await SpecialPrices.findOne({ where: { userId, variantId } });
    if (existing) {
        existing.price = price;
        await existing.save();
        return existing;
    }
    return await SpecialPrices.create({ userId, variantId, price });
};

const deleteSpecialPrice = async (id) => {
    return await SpecialPrices.destroy({ where: { id } });
};

module.exports = {
    getSpecialPricesForUser,
    upsertSpecialPrice,
    deleteSpecialPrice,
};
