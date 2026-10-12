const Sequelize = require('sequelize')
const db = require('../index.js')

const InvoiceLineItems = db.define(
    'invoicelineitems',
    {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        product_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        quantity: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        unit_price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        },
        total_price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        },
        created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
        },
    },
    {
        tableName: 'invoicelineitems',
        timestamps: false,
    }
)

module.exports = InvoiceLineItems