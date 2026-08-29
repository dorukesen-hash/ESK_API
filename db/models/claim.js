const Sequelize = require('sequelize')
const db = require('../index.js')

const Claim = db.define('claim', {
  account: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  companyName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  contactName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: { isEmail: true },
  },
  orderNo: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  read: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  // The real claim table's timestamp columns are literally named
  // "createdAt"/"updatedAt" (camelCase), unlike every other table in this app -
  // the global underscored:true default (db/index.js) maps the implicit
  // timestamp attributes to created_at/updated_at instead, which don't exist
  // and 500 every query. An explicit `field` always wins over the automatic
  // underscore transform (passing createdAt/updatedAt as model-option strings
  // does NOT - it only renames the attribute, which then still gets
  // underscored). Every other column still underscores normally (company_name,
  // contact_name, order_no, user_id all confirmed snake_case in the live schema).
  createdAt: {
    type: Sequelize.DATE,
    field: 'createdAt',
  },
  updatedAt: {
    type: Sequelize.DATE,
    field: 'updatedAt',
  },
})

module.exports = Claim
