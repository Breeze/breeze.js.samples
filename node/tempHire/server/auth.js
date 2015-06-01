(function (exports) {
    'use strict';

    var session = require('express-session');
    var passport = require('passport');
    var LocalStrategy = require('passport-local').Strategy;

    passport.use(new LocalStrategy(
        function(username, password, done) {
            if(username === 'Admin' && password === 'password') {
                return done(null, { username: username });
            }
            return done(null, false, { message: 'Unable to authenticate username and password.' });
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user);
    });

    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    exports.configureAuthentication = configureAuthentication;

    function configureAuthentication(app) {

        app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
        app.use(passport.initialize());
        app.use(passport.session());

        app.post('/breeze/account/login',
            passport.authenticate('local', {failureRedirect: '/'}),
            function(req, res) {
                res.status(200).json(req.user);
        });

        app.get('/breeze/account/logout', function(req, res, next) {
            req.logout();
            res.redirect('/');
        });
    }

})(module.exports);