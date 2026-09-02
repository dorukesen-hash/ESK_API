const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../db/models')
const { generateTokens } = require('../controller/tokenController');
const { ensureCustomerForUser } = require('../controller/customerController');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_REDIRECT_URI
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                //find user by google id
                let user = await User.findOne({ where: { googleId: profile.id } });
                if(user){console.log("user found")}
                if(!user){console.log("new user created")}
                // if not registered register user
                if (!user) {

                    user = await User.create({
                        googleId: profile.id,
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        avatar: profile.photos[0].value,
                        isAuthenticated: true,
                        isActive: true,
                        password: "",
                        surname: ''
                    });
                    await ensureCustomerForUser(user);
                }

                // Create token
                const { token, reftoken } = generateTokens(user);
                await User.update(
                    { token, reftoken},
                    { where: { id: user.id } }
                );

                return done(null, { token, reftoken, user });
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

module.exports = passport;