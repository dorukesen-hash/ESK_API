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
                const email = profile.emails[0].value;

                //find user by google id
                let user = await User.findOne({ where: { googleId: profile.id } });

                if (!user) {
                    // No user linked to this Google id yet - but someone may
                    // already have an email/password account with the same
                    // email (email is unique on the User model), in which
                    // case creating a second row below would throw a unique
                    // constraint error and fail the whole sign-in. Link the
                    // Google id onto that existing account instead of
                    // creating a duplicate, so the same person can log in
                    // either way afterward.
                    const existingByEmail = await User.findOne({ where: { email } });

                    if (existingByEmail) {
                        console.log("linking Google id to existing email account");
                        await existingByEmail.update({ googleId: profile.id });
                        user = existingByEmail;
                    } else {
                        console.log("new user created");
                        user = await User.create({
                            googleId: profile.id,
                            email,
                            name: profile.displayName,
                            avatar: profile.photos[0].value,
                            isAuthenticated: true,
                            isActive: true,
                            password: "",
                            surname: ''
                        });
                        await ensureCustomerForUser(user);
                    }
                } else {
                    console.log("user found");
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