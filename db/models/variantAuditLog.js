const Sequelize = require('sequelize')
const db = require('../index.js')

// One row per changed field (update), or one row per whole-row action
// (create/delete, field left null). timestamps:true gives createdAt for free
// as the "when" - no separate date column needed.
const VariantAuditLog = db.define('variant_audit_log', {
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
}, { timestamps: true, updatedAt: false });

module.exports = VariantAuditLog
