const { User, Cart, ShippingProfiles, Order} = require('../db/models')
const AppError = require('../utils/appError')


// Find user by email
const getUserByEmail = async (email) => {
    const userObject = await User.findOne({ where: { email } })
    if (!userObject) {
        console.log('No user found')
    }
    if(userObject)
    return userObject
}

// Save user to database
const saveUser = async (param) => {
    return await User.create({ ...param })
}

// Update user
const updateUser = async (id, params) => {
    return await User.update(
        { ...params },
        { where: { id } }
    )
}

// find user by ID
const getUserById = async (id) => {
   
    const user =  await User.findByPk(id, {
        attributes: [
            'id',
            'email',
            'name',
            'surname',
            'address',
            'phone',
            'dateOfBirth',
            'isActive',
            'isAuthenticated',
            'isPaid',
            'isAdmin'
        ],
        include:[{model:Cart},{model: ShippingProfiles}]
    })

    //check the first order
    const orderCount = await Order.count({where: { userId:user.id}})
    const plainUser = user.get({ plain: true });
    plainUser.firstOrder = orderCount === 0;
    console.log(plainUser.firstOrder)
    return plainUser;

}

// find user by reftoken
const getUserByReftoken = async (reftoken) => {
    return await User.findOne({ where: { reftoken } })
}



const loginUser = async (email, password) => {
    const user = await User.findOne({
        where: { email: email.trim().toLowerCase() },
    })
    if (!user)
        throw new AppError(`Email not found.`, 500)

    if (!user.validatePassword(password))
        throw new AppError(`Incorrect password.`, 500)

    if (!user.isAuthenticated)
        throw new AppError(
            `Your account has not been verified yet. Please check your email to verify your account.`,
            500
        )

    if (!user.isActive) {
        throw new AppError('Account frozen, please contact support', 500)
    }

    return user
}

const getUsers = async () => {
    return await User.findAll()
}

const getUserForRefToken = async (reftoken) => {
    const user = await User.findOne({ where: { reftoken } })
    // const organizasyon = await Organization.findByPk(user.organizationId)

    if (!user) throw new AppError(`Email veya Şifreyi Hatalı Girdiniz`, 401)
    if (!user.isAuthenticated)
        throw new AppError(
            `Lütfen hesabınızı doğrulayınız. Doğrulama maili gelmediyse tekrar isteyebilirsiniz.`,
            500
        )

    if (!user.isActive) {
        throw new AppError('Hesabiniz askiya askiya alinmistir.', 500)
    }

    return user
}

const getUserBy = async (param) => {
    return await User.findOne({
        where: { ...param },
    })
}

const passChange = async (data /*userData*/) => {
    const { id, password, newPassword, newPassword2 } = data

    const user = await User.findByPk(id)

    if (!password || !newPassword || !newPassword2) {
        throw new AppError('Gerekli bilgiler eksik.', 500)
    }
    if (newPassword !== newPassword2) {
        throw new AppError('Parolalar aynı olmalı.', 500)
    }
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
        throw new AppError('Geçersiz parola', 500)
    }

    user.password = await bcrypt.hash(newPassword.trim(), 10)
    await user.save()
    return 'Başarıyla güncellendi'
}

const deleteUser = async (id) => {
    let user = await User.findByPk(id)
    if (!user) throw new AppError('User not found.', 500)
    return await User.destroy({ where: { id: id }})
}


module.exports = {
    getUserByEmail,
    saveUser,
    updateUser,
    getUserById,
    getUserByReftoken,
    loginUser,
    getUsers,
    deleteUser,
    getUserBy,
    passChange,
    getUserForRefToken
}