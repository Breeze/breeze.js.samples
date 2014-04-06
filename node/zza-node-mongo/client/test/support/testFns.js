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

    extendString();
    addCustomMatchers();
    extendExpect();

    var fns = {
        expectToFailFn: expectToFailFn,
        failed: failed,
        spyOnToastr: spyOnToastr
    };

    return fns;
    ////////////
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
     *********************************************************/
    function spyOnToastr() {
        beforeEach(function () {
            // Do not let toastr pop-up toasts
            // Do make spy so can find out when called and how
            spyOn(toastr, 'error');
            spyOn(toastr, 'info');
            spyOn(toastr, 'success');
            spyOn(toastr, 'warning');
        });
    }
})();
