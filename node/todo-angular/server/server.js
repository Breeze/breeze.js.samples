/**
 * Express application server handling all client requests
 *
 * RUN NOTES:
 * -------------------------
 * In this app, the server runs in one directory (server) and the client
 * application's "static content" is served from a different directory (client)
 * because we want to sandbox client access to the client directory and
 * prevent clients from accessing the purely server assets (like server.js).
 *
 * From terminal or console window, you might do the following:
 * > cd <projectDir>/server
 * > node server.js
 *
 * Then open browser to 'localhost:3000'
 *
 */
var express        = require('express')
    , app          = express()
    , bodyParser   = require('body-parser')
    , breezeRoutes = require('./breeze-routes')
    , compress     = require('compression')
    , errorHandler = require('./errorHandler')
    , isDev        = app.get('env') === 'development'
    , logger       = require('morgan')
    , port         = process.env["PORT"] || 3000;

app.use(logger('dev'));
app.use(compress());
app.use(bodyParser()); // both json & urlencoded
app.use(express.static(__dirname + '/../client'));

breezeRoutes.init(app); // Configure breeze-specific routes for REST API

// a test POST endpoint ... for the demo
if (isDev){
    app.post( '/ping', function(req, res, next){
        console.log(req.body);
        res.send('pinged!!!');
    });
}

// this middleware goes last to catches anything left
// in the pipeline and reports to client as an error
app.use(errorHandler);

// Start listening for HTTP requests
app.listen(port);

console.log('env = '+ app.get('env') +
    '\n__dirname = ' + __dirname  +
    '\nprocess.cwd = ' + process.cwd() );

console.log('\nListening on port '+ port);