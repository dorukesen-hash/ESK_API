const Sequelize = require('sequelize')
const db = require('../index.js')

// Status changes (manual dropdown edit, "Complete Order", or a refund) on
// an Order - none of these were tracked before. action: 'status_change' |
// 'refund'. field is only set for 'status_change' rows ('orderstatusId').
const OrderAuditLog = db.define('order_audit_log', {
    action: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    field: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    oldValue: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
    newValue: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
}, { timestamps: true, updatedAt: false })

module.exports = OrderAuditLog
