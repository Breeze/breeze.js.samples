/* jshint camelcase:false */
var gulp = require('gulp');
var pkg = require('./package.json');
var plug = require('gulp-load-plugins')();
var env = plug.util.env;
var log = plug.util.log;

gulp.task('help', plug.taskListing);

/**
 * @desc Lint the code
 */
gulp.task('jshint', function () {
    log('Linting the JavaScript');

    var sources = [].concat(pkg.paths.js, pkg.paths.nodejs);
    return gulp
        .src(sources)
        .pipe(plug.jshint('./.jshintrc'))
        .pipe(plug.jshint.reporter('jshint-stylish', {verbose: true}));
});

/**
 * @desc Watch files and run jshint
 */
gulp.task('spy', function () {
    log('Watching JavaScript files');

    var js = ['gulpfile.js'].concat(pkg.paths.js);

    gulp
        .watch(js, ['jshint'])
        .on('change', logWatch);

    function logWatch(event) {
        log('*** File ' + event.path + ' was ' + event.type + ', running tasks...');
    }
});

/**
 * serve the dev environment
 */
gulp.task('serve-dev', function () {
    serve({env: 'dev'});
    startLivereload('development');
});

function startLivereload(env) {
    var path = [pkg.paths.client + '/**'];
    var options = {auto: true};
    plug.livereload.listen(options);
    gulp
        .watch(path)
        .on('change', function (file) {
            plug.livereload.changed(file.path);
        });
    log('Serving from ' + env);
}

function serve(args) {
    var options = {
        script: pkg.paths.server + 'app.js',
        delayTime: 1,
        ext: 'html js',
        env: {'NODE_ENV': args.env},
        watch: ['gulpfile.js',
                'package.json',
                pkg.paths.server,
                pkg.paths.client]
    };

    return plug.nodemon(options)
        //.on('change', tasks)
        .on('restart', function () {
            log('restarted!');
        });
}

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