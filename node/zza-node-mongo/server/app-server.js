
var express      = require('express')
  //, path         = require('path')
  , logger       = require('morgan')
  //, cookieParser = require('cookie-parser')
  , bodyParser   = require('body-parser')
  , fileServer   = require('serve-static')
  , breezeRoutes = require( './breeze/routes')
  , port         = process.env["PORT"] || 3000
  , app          = express();

        app.use( logger('dev')              );
        app.use( bodyParser.json()          );
        app.use( bodyParser.urlencoded()    );

        // Configure both breeze-specific routes for REST API
        breezeRoutes.configure( app );

        // Support static file content
        app.use( fileServer( process.cwd() ));

        // Start listen for HTTP requests
        app.listen( port );

        console.log('__dirname = ' + __dirname + '\n' +
            'process.cwd = ' + process.cwd() );

        console.log('\nListening on port '+ port);
// ************************************
// Module Exports
// ************************************

module.exports = app;
