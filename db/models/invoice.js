const Sequelize = require('sequelize')
const db = require('../index.js')

const Invoice = db.define('invoice', {
    uuid: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    code: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    type: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    documentNumber: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    billingSeries: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    billingId: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
    exchangeRate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    description: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
    note: {
        type: Sequelize.TEXT,
        allowNull: true,
    },
    issueDate: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    dueDate: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    paymentDate: {
        type: Sequelize.STRING,
        allowNull: true,
    },

    withholding_rate: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
    vat_withholding_rate: {
        type: Sequelize.INTEGER,
        allowNull: true,
    },
    withholding: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    invoice_discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    is_abroad: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
    },
    isEmail: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
    },
    totalVat: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    grandTotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    grandTotalInclVat: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    paymentTotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
    },
    invoiceType: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    taxType: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    webAddress: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    paymentType: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    paymentPlatform: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    carrierName: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    carrierVkn: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    shipmentDate: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    deliveryMethod: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    shippingMethod: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    vatWithholdingCode: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    vatExemptionReasonCode: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    vatExemptionReason: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    inbox: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
    },
})

module.exports = Invoice
