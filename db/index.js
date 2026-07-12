require('dotenv').config()

const sequelize = require('sequelize')
const name = process.env.DATABASE_NAME
const url = process.env.DATABASE_URL
// const config = require(__dirname + '/../util/config.json')['dbconfig']
// const config = {
//     username: process.env.DATABASE_USER,
//     password: process.env.DATABASE_PASSWORD,
//     database: process.env.DATABASE_NAME,
//     host: process.env.DATABASE_HOST,
//     port: process.env.DATABASE_PORT,
//     dialect: 'postgres',
// }
// create the database instance
const db = (module.exports = new sequelize(url, {
    // ...config,
    logging: false, // export DEBUG=sql in the environment to get SQL queries
    define: {
        underscored: true, // use snake_case rather than camelCase column names
        freezeTableName: true, // don't change table names from the one specified
        timestamps: true, // automatically include timestamp columns,
        // charset: 'utf8',
        // dialectOptions: {
        //     collate: 'utf8_general_ci',
    },
}))
// pull in our models
require('./models')
//connection open
function sync(force = false) {
    console.log('DB Host:', url)
    console.log('db sync param:force ', force)
    // console.log('db password ', config.password);
    // console.log('db process.env.DATAAPI_DB_PASS ', process.env.DATAAPI_DB_PASS);

    return db
        .sync({ force })
        .then(() => console.log(`Synced models to db`, name))
        .catch((fail) => {
            console.log(fail)
        })
}

db.didSync = sync()
