/**
 * FROM:  https://github.com/johnpapa/ngSpecPrep
 *
 * Ward Bell and John Papa
 *
 * Creates the ngSpecPrep object to add common features
 * to help with sync and async Angular/Jasmine tests.
 * Decorates an object (specContext) that represents the spec
 * with these new features.
 *
 * Contains:
 *      clearTester - clears the ngMidwayTester after a test is complete
 *      failed - failure reporter to be used within promise fails
 *      prepareSpec - sync variety of convenience functions are set on specContext
 *      prepareAsyncSpec - async flavor of prepareSpec
 *
 * Depends on ngMidwayTester
 *     https://github.com/yearofmoo/ngMidwayTester
 */
var ngSpecPrep = (function () {
    'use strict';

    window.testing = true;

    extendString();
    addCustomMatchers();
    extendExpect();

    var fns = {
        clearTester: clearTester,
        failed: failed,
        prepareSpec: prepareSpec,
        prepareAsyncSpec: prepareAsyncSpec
    };

    return fns;

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/

    /*******************************************************
     * Setup for all async tests
     * 
     * This gets the app module, executes the config and run blocks.
     * Purpose: Setup the module.
     * Also prepares "specContext" object
     *******************************************************/
    function prepareAsyncSpec(specContext, moduleName) {
        moduleName = moduleName || 'app';
        specContext.tester = ngMidwayTester(moduleName);
        var inject = specContext.inject = specContext.tester.inject;
        var injectables =
            ['$controller', '$location', '$q', '$rootScope', '$timeout'];
        injectables = injectables.map(function (i) { return inject(i); });
        initSpecContext.apply(specContext, injectables);
        return specContext; // returns the initial environment object for my tests
    }

    /*******************************************************
     * Setup for all sync tests
     * 
     * This gets the app module, executes the config and run blocks.
     * Purpose: Setup the module.
     * Also prepares "specContext" object
     *******************************************************/
    function prepareSpec(specContext, moduleName) {
        moduleName = moduleName || 'app';
        module(moduleName);
        var $injector;
        specContext.inject = function (item) {
            return $injector.get(item);
        },
        inject(function (_$injector_, $controller, $location, $q, $rootScope, $timeout) {
            $injector = _$injector_;
            initSpecContext.call(specContext,
                $controller, $location, $q, $rootScope, $timeout);
        });
        return specContext; // returns the initial environment object for my tests
    }

    /*******************************************************
     * Setup the specContext for each spec with the common 
     * Angular features we use in specs.
     *******************************************************/
    function initSpecContext($controller, $location, $q, $rootScope, $timeout) {
        this.controllerFactory = $controller; // that's what $controller really is
        this.$location = $location;
        this.$q = $q;
        this.$rootScope = $rootScope;
        this.$timeout = $timeout;

        this.createScope = function () { return this.$rootScope.$new(); };
        this.flush = function () {
            if (!$rootScope.$$phase) {
                $rootScope.$digest();
            }
        };
        this.timeoutFlush = function () {
            try {
                $timeout.flush();
            } catch (e) {
                /* don't care if it fails */
            }
        };
    }

    /*******************************************************
     * destroy and clear the tester after test is complete
     *******************************************************/
    function clearTester(specContext) {
        var tester = specContext.tester;
        if (tester) {
            tester.destroy();
            specContext.tester = null;
        }
    }

    /*******************************************************
     * String extensions
     * Monkey punching JavaScript native String class
     * w/ format, startsWith, endsWith
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
})();