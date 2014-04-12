/**
 * Express application server handling all client requests
 */
var express        = require('express')
    , app          = express()
    , bodyParser   = require('body-parser')
    , breezeRoutes = require('./breeze-routes')
    , compress     = require('compression')
    , cors         = require('cors')
    , errorHandler = require('./errorHandler')
    , favicon      = require('static-favicon')
    , fileServer   = require('serve-static')
    , http         = require('http')
    , isDev        = app.get('env') === 'development'
    , logger       = require('morgan')
    , port         = process.env["PORT"] || 3000;

app.use( favicon());
app.use( logger('dev'));
app.use( compress());
app.use( bodyParser()); // both json & urlencoded

// Support static file content
// Consider 'st' module for caching: https://github.com/isaacs/st
app.use( fileServer( process.cwd() ));

app.use(cors());               // enable ALL CORS requests
breezeRoutes.init( app ); // Configure breeze-specific routes for REST API

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

// create server (in case interested in socket.io)
var server = http.createServer(app);

// Start listening for HTTP requests
server.listen(port); // app.listen( port ); // if we weren't using 'server'

console.log('env = '+ app.get('env') +
    '\n__dirname = ' + __dirname  +
    '\nprocess.cwd = ' + process.cwd() );

console.log('\nListening on port '+ port);
