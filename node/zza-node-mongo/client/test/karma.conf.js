// Karma configuration
module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    // resolved relative to where this karma.conf file is
    basePath: '..',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
        /* vendor libraries */
        './vendor/angular/angular.js',
        './vendor/angular-sanitize/angular-sanitize.js',
        './vendor/angular-ui-router/angular-ui-router.js',
        './vendor/angular-bootstrap/ui-bootstrap-tpls.js',

        './vendor/breeze/breeze.debug.js',
        './vendor/breeze/breeze.angular.js',
        './vendor/breeze/breeze.dataservice.mongo.js',
        './vendor/breeze/breeze.metadata-helper.js',

        './vendor/jquery/jquery.min.js',
        './vendor/toastr/toastr.js',

        /* test libraries */
        './test/lib/angular-mocks.js',
        './test/lib/ngMidwayTester.js',
        './test/lib/sinon-1.9.0.js',
        './test/lib/bind-polyfill.js', // Needed for phantomJS

        /* application scripts */
        './app/app.js', // ensure it loads first
        './app/**/*.js',

        /* test data and helper function support */
        './test/support/testFns.js',

        /* Specs (tests) */
        './test/specs/*[Ss]pec.js'
    ],


    // list of files to exclude
    exclude: [
        /* testrunner configurations */
        './test/support/**/*.config.js',
        './test/support/**/*.boot.js'
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {

    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)

    // browsers: ['PhantomJS'],
    browsers: ['Chrome'],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
