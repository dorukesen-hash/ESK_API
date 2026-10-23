#!/usr/bin/env node
// `variant` is a pre-existing table; Sequelize's default sync({ force: false })
// only CREATEs tables that don't exist yet - it never ALTERs an existing
// table to add a column a model newly defines (that needs `alter: true`,
// which this codebase deliberately doesn't pass to its one shared sync()
// call, since that would also let Sequelize try to alter every other
// mismatched column across every other model). So Variant.belongsTo(CatalogNode,
// { foreignKey: 'nodeId' }) (db/models/index.js) never actually created the
// column on its own - this one-off, idempotent script does, exactly once per
// environment this branch is deployed to.
const sequelize = require('../db/index.js')

async function run() {
  const queryInterface = sequelize.getQueryInterface()
  const columns = await queryInterface.describeTable('variant')
  if (columns.node_id) {
    console.log('variant.node_id already exists - nothing to do.')
    return
  }
  await queryInterface.addColumn('variant', 'node_id', {
    type: require('sequelize').INTEGER,
    allowNull: true,
  })
  console.log('Added variant.node_id.')
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
