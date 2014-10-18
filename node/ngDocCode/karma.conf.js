// Karma configuration

module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: './',

        // frameworks to use
        // some available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'sinon', 'chai-sinon'],

        // list of files / patterns to load in the browser
        files: [

            './node_modules/ng-midway-tester/src/ngMidwayTester.js',

            './bower_components/angular/angular.js',
            './bower_components/angular-mocks/angular-mocks.js',
            './bower_components/angular-animate/angular-animate.js',
            './bower_components/angular-route/angular-route.js',
            './bower_components/angular-sanitize/angular-sanitize.js',

            './bower_components/breezejs/breeze.debug.js',
            './bower_components/breezejs/labs/breeze.angular.js',
            './bower_components/breezejs/labs/breeze.getEntityGraph.js',
            './bower_components/breezejs/labs/breeze.metadata-helper.js',

            './public/test/lib/bindPolyfill.js', // for phantom.js

            /* Spec helpers */
            './public/test/lib/specHelper.js',
            './public/test/lib/testFns.js',
            './public/test/lib/*.js',

            /* Specs */
            './public/test/*.spec.js',

            // These "midway" specs require a running server
            './public/test/server_specs/**/*.spec.js'

        ],

        // list of files to exclude
        exclude: [
            // Excluding tests that require a server for now; comment this line out when you want to run them
            //'./public/test/server_specs/**/*.spec.js'
        ],

        proxies: {
            '/': 'http://localhost:8888/'
        },

        // pre-process matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'public/**/*.js': 'coverage'
        },

        // test results reporter to use
        // possible values: 'dots', 'progress', 'coverage'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress'],

        coverageReporter: {
            type: 'lcov',
            dir: 'test/coverage'
        },

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
//        browsers: ['Chrome', 'ChromeCanary', 'FirefoxAurora', 'Safari', 'PhantomJS'],
        browsers: ['PhantomJS'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false
    });
};

