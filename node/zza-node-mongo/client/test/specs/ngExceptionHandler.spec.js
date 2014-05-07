/*********************************************
 * Prove that we can reconfigure Angular's mock $exceptionHandler
 * and stop it from rethrowing exceptions that are caught by $q
 * See https://docs.angularjs.org/api/ngMock/service/$exceptionHandler
 **********************************************************/
describe('ngExceptionHandler', function () {
    'use strict';
    var $q, $rootScope;

    var flush = function(){$rootScope.$apply();};

    // mock out appStart so app doesn't run automatically
    var appStart = {
        start: jasmine.createSpy('start')
    };
    var appStartMock = function ($provide) { $provide.value('appStart', appStart);};

    describe("when $exceptionHandler RETHROWS exceptions thrown in $q (default)", function () {

        // see this inside testFns.beforeEachApp();
        beforeEach(module('app',appStartMock));

        // use of injector triggers 'app' load
        beforeEach(inject(function(_$q_, _$rootScope_ ){
                $q = _$q_;
                $rootScope = _$rootScope_;
        }));

        it("app calls appStart.start", function () {
            expect(appStart.start).toHaveBeenCalled();
        });

        it("exception caught in try/catch is no problem", function () {
            //throw new Error("bare test error")
            try {
                throw new Error("Test error in try")
            } catch (e){ } // exception is not presented to console
            expect(true).toBe(true);
        });
        it("exception thrown in a 'then' is rethrown by $exceptionHandler and test fails", function () {
            var wasCaught;
            expect(function(){
                $q.when(true)
                    .then(function(){
                        throw new Error("error in 'then' fn");
                    }).catch(function(e){
                        wasCaught = true;
                    });
                flush();
                expect.toFail("should have thrown before can get here");
            }).toThrow();
        });
        it("exception thrown in a 'catch' is rethrown by $exceptionHandler and test fails", function () {
            var wasCaught;
            expect(function(){
                $q.reject(true)
                    .catch(function(){
                        throw new Error("error in 'then' fn");
                    }).catch(function(e){
                        wasCaught = true;
                    });
                flush();
                expect.toFail("should have thrown before can get here");
            }).toThrow();
        });
    });

    describe("when $exceptionHandler LOGS exceptions thrown in $q", function () {
        var exceptionHandler;
        // see this inside testFns.beforeEachApp();
        beforeEach(function(){
            module('app', appStartMock, function($exceptionHandlerProvider) {
                $exceptionHandlerProvider.mode('log');
                exceptionHandler = $exceptionHandlerProvider.$get();
            });
        });

        // use of injector triggers 'app' load
        beforeEach(inject(function(_$q_, _$rootScope_){
            $q = _$q_;
            $rootScope = _$rootScope_;
        }));

        it("exception thrown in a 'then' is no problem", function () {
            var wasCaught;
            $q.when(true)
                .then(function(){
                    throw new Error("error in 'then' fn");
                }).catch(function(e){
                    wasCaught = true;
                });
            flush();
            expect(wasCaught).toBe(true);
            // exception in 'then' was logged into the exceptionHandler.errors
            var emsg = exceptionHandler.errors[0].message;
            expect(emsg).toMatch(/then/);
            console.log(emsg)
        });

        it("exception thrown in a 'catch' is no problem", function () {
            var wasCaught;
            $q.reject(false)
                .catch(function(e){
                    throw new Error("error in 'catch' fn");
                }).catch(function(e){
                    wasCaught = true;
                });
            flush();
            expect(wasCaught).toBe(true);
            // exception in 'catch' was logged into the exceptionHandler.errors
            var emsg = exceptionHandler.errors[0].message;
            expect(emsg).toMatch(/catch/);
            console.log(emsg);
        });
    });
});
