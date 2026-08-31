const { Cart, User} = require('../db/models')
const {where} = require("sequelize");


// Merge a guest (cookie) cart into the logged-in user's real DB cart -
// called from GET /cart/ whenever the request carries a non-empty guest
// cart, so items added before login aren't silently dropped once the DB
// cart takes over. Existing lines keep the guest's quantity (last write
// wins); new lines are appended.
const mergeCart = async (user, cart) => {
    let userObject = await User.findOne({where: {id: user.id}, include: [{model: Cart}]})

    // Brand-new user with no cart row yet.
    if (userObject.cartId === null) {
        const newCart = await Cart.create({userId: userObject.id, productArray: []})
        userObject.cartId = newCart.id
        await userObject.save()
    }

    let cartObject = await Cart.findOne({where: {id: userObject.cartId}})
    const productArray = cartObject.productArray || []

    for (let i = 0; i < cart.length; i++) {
        const existingItem = productArray.find(item => item.id === cart[i].id)
        if (existingItem) {
            existingItem.quantity = cart[i].quantity
        } else {
            productArray.push(cart[i])
        }
    }
    cartObject.productArray = productArray
    await cartObject.save();

    return cartObject.productArray
}

//Get cart of the user
const getCartByUser = async (id) => {
    const user = await User.findOne({where: { id:id }, include:[{model:Cart}] })
    if (user.cartId === null) {
        const newCart = await Cart.create({userId:user.id, productArray:[]})
        user.cartId = newCart.id
        await user.save()
    }
    const cart = await Cart.findOne({where: {id: user.cart.id}})
    return cart.productArray
}

//Update single item in the user's cart
const updateCart = async(user, item) => {
    try {
        // find user's cart in DB or create one
        let cartUser = await  User.findOne({ where: { id : user.id }, include:[{model:Cart}] })
        let newCart;

        // If user has not a cart, create one and add item
        if (cartUser.cart === null) {
            newCart = await Cart.create({userId:user.id, productArray:[{id:item.id,quantity:item.quantity,isPallet: item.isPallet}]})
            cartUser.cartId = newCart.id
            await cartUser.save()
        }

        // If user has cart, keep previous items and add new one
        if(cartUser.cart !== null) {
            const cart = await Cart.findOne({where:{id : cartUser.cart.id}})

            let tempArray = cart.productArray
            tempArray = tempArray.filter(i => i.id !== item.id)
            tempArray.push(item)
            cart.productArray = tempArray
            await cart.save();
        }

        newCart = await Cart.findOne({where:{id : cartUser.cart.id}})
        return newCart.productArray;

    } catch (error) {
        console.error("updateCart error:", error);
        throw error;
    }

}

const deleteProductFromCart = async (user, id) => {
    const userObject = await User.findOne({where: { id:user.id }, include:[{model:Cart}] })
    const cartObject = await Cart.findOne({where: {id: userObject.cart.id}})

    try{
        cartObject.productArray = cartObject.productArray.filter(i => i.id !== id)
        cartObject.save()
        return cartObject.productArray

    } catch (error){
        console.error("Error deleting product from cart:", error);
    }
}

module.exports = {
    mergeCart,
    getCartByUser,
    updateCart,
    deleteProductFromCart
}