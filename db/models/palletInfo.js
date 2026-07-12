const Sequelize = require('sequelize')
const db = require('../index.js')

const PalletInfo = db.define(
    'pallet_info',
    {
        units: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          pallet_width: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          pallet_length: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          pallet_height: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          pallet_weight: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          box_deci: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          other: {
            type: Sequelize.JSONB,
            allowNull: true
          }
    },
    { createdAt: false, updatedAt: false }
)

module.exports = PalletInfo