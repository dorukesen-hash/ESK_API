const { OrderAuditLog, User } = require('../db/models');

const stringifyValue = (v) => (v === null || v === undefined ? null : String(v));

const logOrderChange = async ({ orderId, actorUserId, action, field, oldValue, newValue }) => {
    await OrderAuditLog.create({
        orderId,
        actorUserId: actorUserId ?? null,
        action,
        field: field ?? null,
        oldValue: stringifyValue(oldValue),
        newValue: stringifyValue(newValue),
    });
};

const getOrderAuditLog = async (orderId) => {
    return await OrderAuditLog.findAll({
        where: { orderId },
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'surname', 'email'] }],
        order: [['createdAt', 'DESC']],
    });
};

module.exports = {
    logOrderChange,
    getOrderAuditLog,
};
