const { PricingAuditLog, User, Variant } = require('../db/models');

const stringifyValue = (v) => (v === null || v === undefined ? null : String(v));

const logSpecialPriceChange = async ({ targetUserId, actorUserId, variantId, action, oldValue, newValue }) => {
    await PricingAuditLog.create({
        type: 'special_price',
        targetUserId,
        actorUserId: actorUserId ?? null,
        variantId,
        action,
        oldValue: stringifyValue(oldValue),
        newValue: stringifyValue(newValue),
    });
};

const logDiscountPercentChange = async ({ targetUserId, actorUserId, oldValue, newValue }) => {
    await PricingAuditLog.create({
        type: 'discount_percent',
        targetUserId,
        actorUserId: actorUserId ?? null,
        variantId: null,
        action: 'update',
        oldValue: stringifyValue(oldValue),
        newValue: stringifyValue(newValue),
    });
};

const getPricingAuditLogForUser = async (targetUserId) => {
    return await PricingAuditLog.findAll({
        where: { targetUserId },
        include: [
            { model: User, as: 'actor', attributes: ['id', 'name', 'surname', 'email'] },
            { model: Variant, attributes: ['id', 'title', 'stock'] },
        ],
        order: [['createdAt', 'DESC']],
    });
};

module.exports = {
    logSpecialPriceChange,
    logDiscountPercentChange,
    getPricingAuditLogForUser,
};
