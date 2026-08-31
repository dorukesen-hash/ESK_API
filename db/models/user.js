const Sequelize = require('sequelize')
const db = require('../index.js')
const bcrypt = require('bcryptjs')
const User = db.define(
    'user',
    {
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        surname: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        address: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        phone: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        dateOfBirth: {
            type: Sequelize.DATE,
            allowNull: true,
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        isAuthenticated: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        isPaid: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        token: {
            type: Sequelize.STRING(1000),
            allowNull: true,
        },
        reftoken: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        emailVerifyToken: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        emailVerifyTokenExpire: {
            type: Sequelize.DATE,
            allowNull: true,
        },
        activation_code: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        userStore: {
            type: Sequelize.ARRAY(Sequelize.INTEGER),
        },
        opstatus: {
            type: Sequelize.ARRAY(Sequelize.INTEGER),
        },
        isPolicy: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        isAdmin: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        googleId: {
            type: Sequelize.STRING,
            allowNull: true
        },
        discountPercent: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
        },
    }
)

User.prototype.getSender = function () {
    return {
        id: this.id,
        name: this.name,
        surname: this.surname,
        email: this.email,
    }
}

User.prototype.validatePassword = function (password) {
    return bcrypt.compareSync(password, this.password)
}

module.exports = User