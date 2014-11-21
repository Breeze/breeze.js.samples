#!/usr/bin/env node
/*jshint node:true*/
'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var compress = require('compression');
var cors = require('cors');
var debug = require('debug')('ngDocCode');
var favicon = require('serve-favicon');
var isDevEnv = app.get('env') === 'development';
var logger = require('morgan');
var port = process.env.PORT || 3456;
var staticFiles = express.static;

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(compress());            // Compress response data with gzip
app.use(cors());                // enable ALL CORS requests

app.use('/bower_components', express.static('./bower_components/'));
app.use('/node_modules', express.static('./node_modules/'));
app.use('/public', express.static('./public/'));
app.use('/', express.static('./public/'));

// All other requests -> index.html
app.use(function(req, res, next) {
    res.sendFile('./index.html');
});

// Error handler
app.use(function(err, req, res, next) {
    // if in development, send err with stacktrace
    // else just send error message.
    var info = isDevEnv ? err.toString() : err.message;
    res.status(err.status || 500).send(info);
});

app.listen(port, function() {
    var msg = 'Express server listening on port ' + port;
    console.log(msg);
    debug(msg);
});
