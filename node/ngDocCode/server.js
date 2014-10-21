#!/usr/bin/env node
var express = require('express');
var bodyParser = require('body-parser');
var debug = require('debug')('ngDocCode');
var compress = require('compression');
var cors = require('cors');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');

var app = express();
var port = process.env.PORT || 3456;
app.set('port', port);

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(compress());            // Compress response data with gzip

// Diagnostic: is the server up
app.get('/api/ping', function(req, res, next) {
    console.log(req.body);
    res.send('pong');
});

app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// All other requests result in sending of index.html
app.use( function(req, res, next) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(cors());                // enable ALL CORS requests

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// send err with stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.send(err.toString());
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
});

app.listen(port, function() {
    var msg = 'Express server listening on port ' + port;
    console.log(msg);
    debug(msg);
});
