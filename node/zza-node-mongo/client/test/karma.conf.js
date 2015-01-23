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
        <!-- *** Vendor Libraries *** -->
        <!-- toastr requires jQuery, not required by breeze or this app -->
        './bower_components/jquery/dist/jquery.min.js',
        './bower_components/angular/angular.js',
        './bower_components/angular-animate/angular-animate.js',
        './bower_components/angular-sanitize/angular-sanitize.js',
        './bower_components/angular-ui-router/release/angular-ui-router.js',
        './bower_components/toastr/toastr.js',
        './bower_components/breeze-client/build/breeze.debug.js',

        <!-- testing this alternative to the core backingstore adapter -->
        './lib/b00_breeze.modelLibrary.new-backingstore.js',

        './bower_components/breeze-client/build/adapters/breeze.dataService.mongo.js',
        './bower_components/breeze-client/build/adapters/breeze.bridge.angular.js',
        './bower_components/breeze-client-labs/breeze.metadata-helper.js',
        './bower_components/breeze-client-labs/breeze.saveErrorExtensions.js',
        './bower_components/angular-ui-bootstrap-bower/ui-bootstrap-tpls.min.js',

        /* test libraries */
        './bower_components/angular-mocks/angular-mocks.js',
        './bower_components/bardjs/dist/bard.js',
        './test/lib/bind-polyfill.js', // Needed for phantomJS

        /* application scripts */
        './app/app.js', // ensure it loads first
        './app/**/*.js',

        /* test helper functions and test data */
        './test/support/testFns.js',
        './test/support/**/*.js',

        /* Specs (tests) */
        './test/specs/*.spec.js',
        './test/specs.async/*.spec.js'
    ],


    // list of files to exclude
    exclude: [
        /* testrunner configurations */
        './test/support/**/*.config.js'
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
