/**
 * Express application server handling all client requests
 */
var express        = require('express')
    , app          = express()
    , bodyParser   = require('body-parser')
    , breezeRoutes = require('./breeze-routes')
    , compress     = require('compression')
    , errorHandler = require('./errorHandler')
    , favicon      = require('static-favicon')
    , fileServer   = require('serve-static')
    , logger       = require('morgan')
    , port         = process.env["PORT"] || 3000;

app.use( favicon()                  );
app.use( logger('dev')              );
app.use( compress()                 );
app.use( bodyParser.json()          );
app.use( bodyParser.urlencoded()    );
app.use( fileServer( process.cwd()  ));// Support static file content

// Configure breeze-specific routes for REST API
breezeRoutes.configure( app );

// this middleware goes last to catches anything left
// in the pipeline and reports to client as an error
app.use(errorHandler);

// Start listening for HTTP requests
app.listen( port );

console.log('env = '+ app.get('env') +
    '\n__dirname = ' + __dirname  +
    '\nprocess.cwd = ' + process.cwd() );

console.log('\nListening on port '+ port);
