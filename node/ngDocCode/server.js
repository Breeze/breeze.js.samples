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
app.set('port', process.env.PORT || 3456);

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(compress());            // Compress response data with gzip
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));

app.use(cors());                // enable ALL CORS requests

// Diagnostic: is the server up
app.get('/api/ping', function(req, res, next) {
    console.log(req.body);
    res.send('pong');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.get('/ping', function(req, res, next) {
        console.log(req.body);
        res.send('pong');
    });

    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + app.address().port);
});
