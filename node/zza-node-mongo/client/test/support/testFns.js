/**
 * Ward Bell
 *
 * Basic Jasmine test helpers and test environment configuration
 *
 * Assumes Jasmine 2.0 (not 1.x!)
 *
 * See
 * - http://jasmine.github.io/2.0/introduction.html
 * - https://github.com/pivotal/jasmine/blob/v2.0.0/release_notes/20.md
 *
 * See also karma for Jasmine 2.0
 * https://github.com/karma-runner/karma-jasmine
 * This app assumes karma and friends installed globally, not in this project.
 * e.g., npm install karma-jasmine@2_0 -g
 *
 */
var testFns = (function () {
    'use strict';

    window.testing = true;

    var metadataStore;

    extendString();
    addCustomMatchers();
    extendExpect();

    var fns = {
        appStartMock: appStartMock,
        beforeEachApp: beforeEachApp,    // typical spec setup
        create_appEntityManager: create_appEntityManager,
        create_testAppModule: create_testAppModule,
        expectToFailFn: expectToFailFn,
        failed: failed,
        host: 'http://localhost:3000/',  // MAKE SURE THIS IS RIGHT AND THE SERVER IS RUNNING
        serviceName: 'breeze/zza/',
        spyOnToastr: spyOnToastr
    };

    return fns;
    ////////////
    /*******************************************************
     * Ensure that 'appStart' service doesn't do anything
     ********************************************************/
    function appStartMock($provide) {
        // appStart service spy ... to see that start was called ... if you care
        var appStart = {
            start: jasmine.createSpy('start')
        };
        $provide.value('appStart', appStart);
    }
    /*******************************************************
     * the 'beforeEach' that establishes the 'App' module with
     * 'appStart' disabled.
     ********************************************************/
    function beforeEachApp() {
        // start with these modules
        var moduleArgs = ['app', appStartMock];
        // add beforeEachApp() arguments to the end of these moduleArgs
        moduleArgs.push.apply(moduleArgs, arguments);

        spyOnToastr(); // make sure toastr doesn't pop toasts.

        // Tell Ng mock module to evaluate these module args in order
        var moduleFn = angular.mock.module.apply(angular.mock.module, moduleArgs);
        beforeEach(moduleFn);
    }
    /*******************************************************
     * Creates test version of the Angular 'app' module
     * with its 'start' disabled by the 'appStartMock'.
     * Accepts additional mocking modules/providers as arguments
     * SIMILAR to body of  'beforeEachApp'
     * DIFFERS in that it calls 'angular.module' rather than 'angular.mock.module'
     ********************************************************/
    function create_testAppModule(){
        // start with 'app' module and 'appStartMock'
        // which disables the 'appStart' service called by app.run()
        var moduleArgs = ['app', appStartMock];

        // add createTestAppModule() arguments to the end of these moduleArgs
        moduleArgs.push.apply(moduleArgs, arguments);

        spyOnToastr(); // make sure toastr doesn't pop toasts.

        // Create the 'testApp' module with these dependent modules evaluated in order
        // Assume can keep redefining this 'testApp' as often as we like.
        var module = angular.module('testApp', moduleArgs);
        return module;
    }

    /*******************************************************
     * Create a BreezeJS 'EntityManager'
     * with the app's dataservice and metadata and model
     * given an injector function with access to the necessary app services
     ********************************************************/
    function create_appEntityManager(injectFn){
        var breeze = injectFn('breeze');

        var fullServiceName = testFns.host+testFns.serviceName;

        var dataService = new breeze.DataService({
                hasServerMetadata: false,
                serviceName: fullServiceName}
        );

        var metadataStore = new breeze.MetadataStore();
        metadataStore.addDataService(dataService);

        var model = injectFn('model');
        model.addToMetadataStore(metadataStore);

        var em = new breeze.EntityManager({
            dataService: dataService,
            metadataStore: metadataStore
        });
        return em;
    }

    /*******************************************************
     * String extensions
     * Monkey punching JavaScript native String class
     * w/ format, startsWith, endsWith to make message construction easier
     * go ahead and shoot me but it's convenient
     ********************************************************/
    function extendString() {
        var stringFn = String.prototype;

        // Ex: "{0} returned {1} item(s)".format(queryName, count));
        stringFn.format = stringFn.format || function () {
            var s = this;
            for (var i = 0, len = arguments.length; i < len; i++) {
                var reg = new RegExp("\\{" + i + "\\}", "gm");
                s = s.replace(reg, arguments[i]);
            }

            return s;
        };

        stringFn.endsWith = stringFn.endsWith || function (suffix) {
            return (this.substr(this.length - suffix.length) === suffix);
        };

        stringFn.startsWith = stringFn.startsWith || function (prefix) {
            return (this.substr(0, prefix.length) === prefix);
        };

        stringFn.contains = stringFn.contains || function (value) {
            return (this.indexOf(value) !== -1);
        };
    }

    /*********************************************************
     * Add our custom Jasmine test matchers which are like custom asserts.
     * See http://jasmine.github.io/2.0/custom_matcher.html
     *********************************************************/
    function addCustomMatchers() {
        beforeEach(function () {
            jasmine.addMatchers({
                toFail: toFail
            });
        });
    }

    /*********************************************************
     * Extend Jasmine window.expect so can write
     * expect.toFail(failMessage)
     *********************************************************/
    function extendExpect() {
        expect.toFail = function (failMessage) {
            expect().toFail(failMessage);
        };
    }

    /*********************************************************
     * return a function that invokes expect.toFail(failureMessage)
     *********************************************************/
    function expectToFailFn(message){
        return function(){ expect.toFail(message); }
    }
    /*********************************************************
     * All purpose failure reporter to be used within promise fails
     *********************************************************/
    function failed(err) {
        var msg = 'Unexpected test failure: ' + (err.message || err);
        if (err.body) {
            msg += err.body.Message + " " + err.body.MessageDetail;
        } else if (err.statusText) {
            msg += err.statusText;
        }
        console.log(msg);
        expect.toFail(msg);
    }

    /*********************************************************
     * Jasmine matcher that always fails with the message
     * Ex: expect().toFail('what a mess');
     *********************************************************/
    function toFail() {
        return {
            compare: function (_, failMessage) {
                return {
                    pass: false, // always fails
                    message: failMessage
                };
            }
        };
    }

    /*********************************************************
     * A jasmine 'beforeEach' that stubs out 'toastr' so the
     * app doesn't try to pop up toast messages in the DOM
     * jasmine removes after each spec
     * We CAN know if the methods were called and how
     *********************************************************/
    function spyOnToastr() {
        beforeEach(function () {
            // Do not let toastr pop-up toasts
            // Do make spy so can find out when called and how
            // '.and' and '.calls' are telltales of a jasmine spy
            // according to 'j$.isSpy' in jasmine.js [~171]
            if (toastr.error.and || toastr.error.calls) {
                return; // already spying on toastr
            }
            spyOn(toastr, 'error');
            spyOn(toastr, 'info');
            spyOn(toastr, 'success');
            spyOn(toastr, 'warning');
        });
    }
})();
