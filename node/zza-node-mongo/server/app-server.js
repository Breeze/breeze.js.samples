
var express        = require('express')
    , app          = express()
    , bodyParser   = require('body-parser')
    , breezeRoutes = require('./breeze/routes')
    , compress     = require('compression')
    //, cookieParser = require('cookie-parser')
    , errorHandler = require('./breeze/errorHandler')
    , favicon      = require('static-favicon')
    , fileServer   = require('serve-static')
    , logger       = require('morgan')
    //, path         = require('path')
    , port         = process.env["PORT"] || 3000;

    module.exports = app;

    app.use( favicon()                  );
    app.use( logger('dev')              );
    app.use( compress()                 );
    app.use( bodyParser.json()          );
    app.use( bodyParser.urlencoded()    );

    // Configure both breeze-specific routes for REST API
    breezeRoutes.configure( app );

    // Support static file content
    app.use( fileServer( process.cwd() ));

    app.use(errorHandler);

    // Start listening for HTTP requests
    app.listen( port );

    console.log('env = '+ app.get('env') +
        '\n__dirname = ' + __dirname  +
        '\nprocess.cwd = ' + process.cwd() );

    console.log('\nListening on port '+ port);


