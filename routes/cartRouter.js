const router = (module.exports = require('express').Router());
const { getCartByUser, updateCart, mergeCart, deleteProductFromCart } = require("../controller/cartController");
const { User, Cart } = require("../db/models");

const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
};

// /cart/
router.get('/', async (req, res, next) => {
    const user = req.user;
    const rawCart = req.cookies?.userCart;
    if (rawCart === undefined) {
        return res.status(400).json({ message: "Bad request! Cart is corrupted" });
    }
    const cart = JSON.parse(rawCart) || [];

    try {
        if (!user) {
            return res.status(200).json(cart);
        }

        // A non-empty cookie cart at this point was built up while logged
        // out - merge it into the real DB cart instead of overwriting it,
        // or it's silently lost the moment this request returns the DB
        // cart's own (possibly empty) contents.
        const userCart = cart.length > 0
            ? await mergeCart(user, cart)
            : await getCartByUser(user.id);
        res.cookie("userCart", JSON.stringify(userCart), cookieOptions);
        return res.status(200).json(userCart);

    } catch (error) {
        next(error);
    }
});

router.put('/update', async (req, res, next) => {
    const user = req.user;
    const rawCart = req.cookies?.userCart;
    let cart = JSON.parse(rawCart || "[]");
    const item = req.body;

    if (!item.id || typeof item.quantity !== 'number') {
        return res.status(400).json({ message: "Invalid item data." });
    }

    try {
        if (!user) {
            const existingItem = cart.find(i => i.id === item.id);
            if (existingItem) {
                existingItem.quantity = item.quantity;
            } else {
                cart.push(item);
            }
            res.cookie("userCart", JSON.stringify(cart), cookieOptions);
            return res.status(200).json(cart);
        }

        if (user) {
            cart = await updateCart(user, item);
            res.cookie("userCart", JSON.stringify(cart), cookieOptions);
        }

        return res.status(200).json(cart);
    } catch (error) {
        next(error);
    }
});

router.delete('/delete', async (req, res, next) => {
    const user = req.user;
    const rawCart = req.cookies?.userCart;
    let cart = JSON.parse(rawCart || "[]");
    const { id } = req.body;

    try {
        if (!user) {
            cart = cart.filter(i => i.id !== id);
            res.cookie("userCart", JSON.stringify(cart), cookieOptions);
            return res.status(200).json(cart);
        }

        if (user) {
            cart = await deleteProductFromCart(user, id);
            res.cookie("userCart", JSON.stringify(cart), cookieOptions);
        }

        return res.status(200).json(cart);
    } catch (error) {
        next(error);
    }
});
