/* jshint camelcase:false */
var gulp = require('gulp');
var browserSync = require('browser-sync');
var del = require('del');
var glob = require('glob');
var karma = require('karma').server;
var merge = require('merge-stream');
var config = require('./gulp.config.json');
//var plato = require('plato');
var $ = require('gulp-load-plugins')();
var reload = browserSync.reload;

var colors = $.util.colors;
var env = $.util.env;
var log = $.util.log;
var port = process.env.PORT || config.defaultPort;
/**
 * env variables can be passed in to alter the behavior, when present.
 * Example: gulp serve-dev
 *
 * --verbose  : Various tasks will produce more output to the console.
 * --nosync   : Don't launch the browser with browser-sync when serving code.
 * --debug    : Launch debugger with node-inspector.
 * --debug-brk: Launch debugger and break on 1st line with node-inspector.
 */
/**
 * List the available gulp tasks
 */
gulp.task('help', $.taskListing);
gulp.task('default', ['help']);

/**
 * Lint the code, create coverage report, and a visualizer
 * @return {Stream}
 */
gulp.task('analyze', function() {
    log('Analyzing source with JSHint, JSCS'); // , and Plato');

    var jshSources = [].concat(config.js, config.specs, config.specHelpers, config.nodejs, [
         '!./public/test/lib/northwindDtoMetadata.js',
         '!./public/test/lib/northwindMetadata.js'
        ]);

    var jshint = analyzejshint(jshSources);
    var jscs = analyzejscs([].concat(config.js, config.nodejs));

    return merge(jshint, jscs);
});


/**
 * Inject all the spec files into the index.html
 * @return {Stream}
 */
gulp.task('build-index', function() {
        log('building index.html');

        var index = config.server + 'index.html';
        return gulp

            // inject the files into index.html
            .src([index])
            .pipe(inject([].concat(config.testharnessjs), 'inject-testharness'))
            .pipe(inject([].concat(config.vendorjs), 'inject-vendor'))
            .pipe(inject([].concat(config.js)))
            .pipe(inject([].concat(config.specHelpers), 'inject-specHelpers'))
            .pipe(inject([].concat(config.specs), 'inject-specs'))
            .pipe(inject([].concat(config.vendorcss), 'inject-vendor'))
            .pipe(inject([].concat(config.css)))


            .pipe(gulp.dest(config.server)); // write the index.html file changes
            //.pipe(gulp.dest(config.build)); // write the index.html file changes


    function inject(path, name) {
            //var pathGlob = config.build + path;
            var options = {
                //ignorePath: config.build.substring(1),
                addRootSlash: false,
                read: false
            };
            if (name) { options.name = name; }
            return $.inject(gulp.src(path), options);
        }
    });

/**
 * Remove all files from the build folder
 * One way to run clean before all tasks is to run
 * from the cmd line: gulp clean && gulp build
 * @return {Stream}
 */
gulp.task('clean', function(cb) {
    log('Cleaning: ' + $.util.colors.blue(config.build));

    var delconfig = [].concat(config.build, config.report);
    del(delconfig, cb);
});

/**
 * Watch files and build
 */
gulp.task('watch', function() {
    log('Watching all files');

    var css = ['gulpfile.js'].concat(config.css, config.vendorcss);
    var images = ['gulpfile.js'].concat(config.images);
    var js = ['gulpfile.js'].concat(config.js);

    gulp
        .watch(js, ['js', 'vendorjs'])
        .on('change', logWatch);

    gulp
        .watch(css, ['css', 'vendorcss'])
        .on('change', logWatch);

    gulp
        .watch(images, ['images'])
        .on('change', logWatch);

    function logWatch(event) {
        log('*** File ' + event.path + ' was ' + event.type + ', running tasks...');
    }
});

/**
 * Run specs once and exit
 * To start servers and run midway specs as well:
 *    gulp test --startServer
 * @return {Stream}
 */
gulp.task('test', function (done) {
    startTests(true /*singleRun*/, done);
});

/**
 * Run specs and wait.
 * Watch for file changes and re-run tests on each change
 * To start servers and run midway specs as well:
 *    gulp autotest --startServer
 */
gulp.task('autotest', function (done) {
    startTests(false /*singleRun*/, done);
});


////////////////

/**
 * Execute JSHint on given source files
 * @param  {Array} sources
 * @param  {String} overrideRcFile
 * @return {Stream}
 */
function analyzejshint(sources, overrideRcFile) {
    var jshintrcFile = overrideRcFile || './.jshintrc';
    log('Running JSHint');
    return gulp
        .src(sources)
        //.pipe($.print()) // list the files in sources
        .pipe($.jshint(jshintrcFile))
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}));
}

/**
 * Execute JSCS on given source files
 * @param  {Array} sources
 * @return {Stream}
 */
function analyzejscs(sources) {
    log('Running JSCS');
    return gulp
        .src(sources)
        .pipe($.jscs('./.jscsrc'));
}

/**
 * serve the DocCode Web API server
 */
gulp.task('start-webapi', function() {

    log('Running DocCode Web API Data Server.\nTo see data, browse to http://localhost:58066/breeze/Northwind/employees');
    exec = require('child_process').exec;
    exec('powershell -noexit .\\start-webapi.ps1',
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        });
});
/**
 * start the test app server in the dev environment
 */
gulp.task('serve-dev', function() {
    serve(true /*isDev*/);
});


/**
 * serve the build environment
 * --debug-brk or --debug
 * --nosync
 * @param  {Boolean} isDev - dev or build mode
 */
function serve(isDev) {
    isDev = (isDev == null) || isDev;
    log('env: '+JSON.stringify(env));
    log('debug: '+env.debug);
    log('debugBrk: '+env.debugBrk);
    var debug = env.debug || env.debugBrk;
    var exec;
    var nodeOptions = {
        script: config.server + 'server.js',
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server]
    };

    if (debug) {
        log('Running node-inspector.\nBrowse to http://localhost:8080/debug?port=5959');
        exec = require('child_process').exec;
        exec('node-inspector');
        nodeOptions.nodeArgs = [debug + '=5959'];
    }

    addWatchForFileReload(isDev);

    return $.nodemon(nodeOptions)
        .on('start', function() { startBrowserSync(); })
        .on('restart', function() {
            log('restarted!');
            setTimeout(function() {
                browserSync.notify('reloading now ...');
                browserSync.reload({stream: false});
            }, 1000); //TODO: move to the config file
        });
}
////////////////

/**
 * Add watches to build and reload using browserSync
 * @param  {Boolean} isDev - dev or build mode
 */
function addWatchForFileReload(isDev) {
    if (isDev) {
        //gulp.watch([config.less], ['styles', browserSync.reload]);
        gulp.watch([config.client + '**/*'], browserSync.reload)
            .on('change', function(event) { changeEvent(event); });
    }
    else {
        gulp.watch([config.js, config.html], ['html', browserSync.reload])
            .on('change', function(event) { changeEvent(event); });
    }
}

/**
 * When files change, log it
 * @param  {Object} event - event that fired
 */
function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

/**
 * Start BrowserSync
 * --nosync will avoid browserSync
 */
function startBrowserSync() {
    if (env.nosync || browserSync.active) {
        return;
    }

    log('Starting BrowserSync on port ' + port);
    browserSync({
        proxy: 'localhost:' + port,
        port: 3001,
        ghostMode: { // these are the defaults t,f,t,t
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'ng-DocCode',
        notify: true,
        reloadDelay: 1000
    });
}

/**
 * Start the tests using karma.
 * @param  {boolean} singleRun - True means run once and end (CI), or keep running (dev)
 * @param  {Function} done - Callback to fire when karma is done
 * @return {undefined}
 */
function startTests(singleRun, done) {
    var child;
    var excludeFiles = [];
    var fork = require('child_process').fork;

    if (env.startServer) {
        log('Starting servers');
        var savedEnv = process.env;
        savedEnv.NODE_ENV = 'dev';
        savedEnv.PORT = 8888;
        child = fork('./server.js', childProcessCompleted);
    } else {
        //excludeFiles.push('./public/test/midway/**/*.spec.js');
    }

    karma.start({
        configFile: __dirname + '/karma.conf.js',
        exclude: excludeFiles,
        singleRun: !!singleRun
    }, karmaCompleted);

    ////////////////

    function childProcessCompleted(error, stdout, stderr) {
        log('stdout: ' + stdout);
        log('stderr: ' + stderr);
        if (error !== null) {
            log('exec error: ' + error);
        }
    }

    function karmaCompleted() {
        if (child) {child.kill();}
        done();
    }
}

/**
 * Formatter for bytediff to display the size changes after processing
 * @param  {Object} data - byte data
 * @return {String}      Difference in bytes, formatted
 */
function bytediffFormatter(data) {
    var difference = (data.savings > 0) ? ' smaller.' : ' larger.';
    return data.fileName + ' went from ' +
        (data.startSize / 1000).toFixed(2) + ' kB to ' + (data.endSize / 1000).toFixed(2) + ' kB' +
        ' and is ' + formatPercent(1 - data.percent, 2) + '%' + difference;
}

/**
 * Format a number as a percentage
 * @param  {Number} num       Number to format as a percent
 * @param  {Number} precision Precision of the decimal
 * @return {Number}           Formatted perentage
 */
function formatPercent(num, precision) {
    return (num * 100).toFixed(precision);
}


