/* jshint camelcase:false */
var gulp = require('gulp');
var browserSync = require('browser-sync');
var del = require('del');
var glob = require('glob');
var karma = require('karma').server;
var merge = require('merge-stream');
var paths = require('./gulp.config.json');
//var plato = require('plato');
var plug = require('gulp-load-plugins')();
var reload = browserSync.reload;

var colors = plug.util.colors;
var env = plug.util.env;
var log = plug.util.log;
var port = process.env.PORT || 7202;

/**
 * List the available gulp tasks
 */
gulp.task('help', plug.taskListing);

/**
 * Lint the code, create coverage report, and a visualizer
 * @return {Stream}
 */
gulp.task('analyze', function() {
    log('Analyzing source with JSHint, JSCS'); // , and Plato');

    var jshSources = [].concat(paths.js, paths.specs, paths.specHelpers, paths.nodejs, [
         '!./public/test/lib/northwindDtoMetadata.js',
         '!./public/test/lib/northwindMetadata.js'
        ]);

    var jshint = analyzejshint(jshSources);
    var jscs = analyzejscs([].concat(paths.js, paths.nodejs));

    return merge(jshint, jscs);
});

/**
 * Create $templateCache from the html templates
 * @return {Stream}
 */
gulp.task('templatecache', function() {
    log('Creating an AngularJS $templateCache');

    return gulp
        .src(paths.htmltemplates)
        // .pipe(plug.bytediff.start())
        .pipe(plug.minifyHtml({empty:true}))
        // .pipe(plug.bytediff.stop(bytediffFormatter))
        .pipe(plug.angularTemplatecache('templates.js', {
            module: 'app.core',
            standalone: false,
            root: 'app/'
        }))
        .pipe(gulp.dest(paths.build));
});

/**
 * Minify and bundle the app's JavaScript
 * @return {Stream}
 */
gulp.task('js', ['analyze', 'templatecache'], function() {
    log('Bundling, minifying, and copying the app\'s JavaScript');

    var source = [].concat(paths.js, paths.build + 'templates.js');
    return gulp
        .src(source)
        // .pipe(plug.sourcemaps.init()) // get screwed up in the file rev process
        .pipe(plug.concat('all.min.js'))
        .pipe(plug.ngAnnotate({add: true, single_quotes: true}))
        .pipe(plug.bytediff.start())
        .pipe(plug.uglify({mangle: true}))
        .pipe(plug.bytediff.stop(bytediffFormatter))
        // .pipe(plug.sourcemaps.write('./'))
        .pipe(gulp.dest(paths.build));
});

/**
 * Copy the Vendor JavaScript
 * @return {Stream}
 */
gulp.task('vendorjs', function() {
    log('Bundling, minifying, and copying the Vendor JavaScript');

    return gulp.src(paths.vendorjs)
        .pipe(plug.concat('vendor.min.js'))
        .pipe(plug.bytediff.start())
        .pipe(plug.uglify())
        .pipe(plug.bytediff.stop(bytediffFormatter))
        .pipe(gulp.dest(paths.build));
});

/**
 * Minify and bundle the CSS
 * @return {Stream}
 */
gulp.task('css', function() {
    log('Bundling, minifying, and copying the app\'s CSS');

    return gulp.src(paths.css)
        .pipe(plug.concat('all.min.css')) // Before bytediff or after
        .pipe(plug.autoprefixer('last 2 version', '> 5%'))
        .pipe(plug.bytediff.start())
        .pipe(plug.minifyCss({}))
        .pipe(plug.bytediff.stop(bytediffFormatter))
//        .pipe(plug.concat('all.min.css')) // Before bytediff or after
        .pipe(gulp.dest(paths.build + 'content'));
});

/**
 * Minify and bundle the Vendor CSS
 * @return {Stream}
 */
gulp.task('vendorcss', function() {
    log('Compressing, bundling, copying vendor CSS');

    var vendorFilter = plug.filter(['**/*.css']);

    return gulp.src(paths.vendorcss)
        .pipe(vendorFilter)
        .pipe(plug.concat('vendor.min.css'))
        .pipe(plug.bytediff.start())
        .pipe(plug.minifyCss({}))
        .pipe(plug.bytediff.stop(bytediffFormatter))
        .pipe(gulp.dest(paths.build + 'content'));
});

/**
 * Copy fonts
 * @return {Stream}
 */
gulp.task('fonts', function() {
    var dest = paths.build + 'fonts';
    log('Copying fonts');
    return gulp
        .src(paths.fonts)
        .pipe(gulp.dest(dest));
});

/**
 * Compress images
 * @return {Stream}
 */
gulp.task('images', function() {
    var dest = paths.build + 'content/images';
    log('Compressing, caching, and copying images');
    return gulp
        .src(paths.images)
        .pipe(plug.cache(plug.imagemin({optimizationLevel: 3})))
        .pipe(gulp.dest(dest));
});

/**
 * Inject all the spec files into the index.html
 * @return {Stream}
 */
gulp.task('build-index', function() {
        log('building index.html');

        var index = paths.servertemplates + 'index.html';
        var stream = gulp

            // inject the files into index.html
            .src([index])
            .pipe(inject([].concat(paths.testharnessjs), 'inject-testharness'))
            .pipe(inject([].concat(paths.vendorjs), 'inject-vendor'))
            .pipe(inject([].concat(paths.js)))
            .pipe(inject([].concat(paths.specHelpers), 'inject-specHelpers'))
            .pipe(inject([].concat(paths.specs), 'inject-specs'))
            .pipe(inject([].concat(paths.vendorcss), 'inject-vendor'))
            .pipe(inject([].concat(paths.css)))


            .pipe(gulp.dest(paths.server)); // write the index.html file changes
            //.pipe(gulp.dest(paths.build)); // write the index.html file changes


    function inject(path, name) {
            //var pathGlob = paths.build + path;
            var options = {
                //ignorePath: paths.build.substring(1),
                addRootSlash: false,
                read: false
            };
            if (name) { options.name = name; }
            return plug.inject(gulp.src(path), options);
        }
    });

/**
 * Inject all the files into the new index.html
 * rev, but no map
 * @return {Stream}
 */
gulp.task('rev-and-inject',
    ['js', 'vendorjs', 'css', 'vendorcss'], function() {
        log('Rev\'ing files and building index.html');

        var minified = paths.build + '**/*.min.*';
        var index = paths.client + 'index.html';
        var minFilter = plug.filter(['**/*.min.*', '!**/*.map']);
        var indexFilter = plug.filter(['index.html']);

        var stream = gulp
            // Write the revisioned files
            .src([].concat(minified, index)) // add all built min files and index.html
            .pipe(minFilter) // filter the stream to minified css and js
            .pipe(plug.rev()) // create files with rev's
            .pipe(gulp.dest(paths.build)) // write the rev files
            .pipe(minFilter.restore()) // remove filter, back to original stream

            // inject the files into index.html
            .pipe(indexFilter) // filter to index.html
            .pipe(inject('content/vendor.min.css', 'inject-vendor'))
            .pipe(inject('content/all.min.css'))
            .pipe(inject('vendor.min.js', 'inject-vendor'))
            .pipe(inject('all.min.js'))
            .pipe(gulp.dest(paths.build)) // write the rev files
            .pipe(indexFilter.restore()) // remove filter, back to original stream

            // replace the files referenced in index.html with the rev'd files
            .pipe(plug.revReplace())         // Substitute in new filenames
            .pipe(gulp.dest(paths.build)) // write the index.html file changes
            .pipe(plug.rev.manifest()) // create the manifest (must happen last or we screw up the injection)
            .pipe(gulp.dest(paths.build)); // write the manifest

        function inject(path, name) {
            var pathGlob = paths.build + path;
            var options = {
                ignorePath: paths.build.substring(1),
                read: false
            };
            if (name) { options.name = name; }
            return plug.inject(gulp.src(pathGlob), options);
        }
    });

/**
 * Build the optimized app
 * @return {Stream}
 */
gulp.task('build',
    ['rev-and-inject', 'images', 'fonts'], function() {
        log('Building the optimized app');

        return gulp.src('').pipe(plug.notify({
            onLast: true,
            message: 'Deployed code!'
        }));
    });

/**
 * Remove all files from the build folder
 * One way to run clean before all tasks is to run
 * from the cmd line: gulp clean && gulp build
 * @return {Stream}
 */
gulp.task('clean', function(cb) {
    log('Cleaning: ' + plug.util.colors.blue(paths.build));

    var delPaths = [].concat(paths.build, paths.report);
    del(delPaths, cb);
});

/**
 * Watch files and build
 */
gulp.task('watch', function() {
    log('Watching all files');

    var css = ['gulpfile.js'].concat(paths.css, paths.vendorcss);
    var images = ['gulpfile.js'].concat(paths.images);
    var js = ['gulpfile.js'].concat(paths.js);

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

/**
 * serve the dev environment, with debug,
 * and with node inspector
 */
gulp.task('serve-dev-debug', function() {
    serve({mode: 'dev', debug: '--debug'});
});

/**
 * serve the dev environment, with debug-brk,
 * and with node inspector
 */
gulp.task('serve-dev-debug-brk', function() {
    serve({mode: 'dev', debug: '--debug-brk'});
});

/**
 * serve the dev environment
 */
gulp.task('serve-dev', function() {
    serve({mode: 'dev'});
});

/**
 * serve the build environment
 */
gulp.task('serve-build', function() {
    serve({mode: 'build'});
});


/**
 * serve the DocCode Web API server
 */
gulp.task('serve-webapi', function() {

    log('Running DocCode Web API server. Browse to http://localhost:58066/breeze/Northwind/employees');
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
        // .pipe(plug.print()) // list the files in sources
        .pipe(plug.jshint(jshintrcFile))
        .pipe(plug.jshint.reporter('jshint-stylish', {verbose: true}));
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
        .pipe(plug.jscs('./.jscsrc'));
}

/**
 * Start the node server using nodemon.
 * Optionally start the node debugging.
 * @param  {Object} args - debugging arguments
 * @return {Stream}
 */
function serve(args) {
    var options = {
        script: paths.server + 'app.js',
        delayTime: 1,
        ext: 'html js',
        env: {'NODE_ENV': args.mode},
        watch: [
            'gulpfile.js',
            'package.json',
            'gulp.config.json',
            paths.server,
            paths.client
        ]
    };

    var exec;
    if (args.debug) {
        log('Running node-inspector. Browse to http://localhost:8080/debug?port=5858');
        exec = require('child_process').exec;
        exec('node-inspector');
        options.nodeArgs = [args.debug + '=5858'];
    }

    return plug.nodemon(options)
        .on('start', function() {
            startBrowserSync();
        })
        //.on('change', tasks)
        .on('restart', function() {
            log('restarted!');
        });
}

/**
 * Start BrowserSync
 * @return {Stream}
 */
function startBrowserSync() {
    if (!env.browserSync) { return; }

    log('Starting BrowserSync');

    browserSync({
        proxy: 'localhost:' + port,
        files: [paths.client + '/**/*.*']
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
        excludeFiles.push('./public/test/midway/**/*.spec.js');
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


