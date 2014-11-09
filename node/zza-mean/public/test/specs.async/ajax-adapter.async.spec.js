/*********************************
 * The stock jQuery and Angular ajax adapters (as of v.1.4.12)
 * have a 'requestInterceptor' function property.
 * That function receives a 'requestInfo' argument consisting of
 *    adapter: // the AJAX adapter itself
 *    config:  // config object argument to the http service
 *             // (requires intimate knowledge of the http service API)
 *    zConfig: // config object that a Breeze data service adapter prepares and passes to the ajax adapter
 *    success: // the adapter function to be called if the http request succeeds
 *    error:   // the adapter function to be called if the http request fails
 *
 * The developer can
 * - change any of these elements just before the adapter calls the http service
 * - do http-service-specific stuff for this particular request,
 *   e.g., setup an angular $http request cancel feature as explained here:
 *   http://odetocode.com/blogs/scott/archive/2014/04/24/canceling-http-requests-in-angularjs.aspx
 * - skip the AJAX service call by setting 'requestInfo.config' to null
 * - invoke the success or error callbacks immediately (best to abort the service call at the same time!)
 * - wrap or replace the success/error callbacks to change or supplement behavior
 *
 * These tests explore some of these possibilities, using the 'angular' $http adapter
 ********************************/
describe('ajax-adapter: ', function () {
    'use strict';

    /*********************************************************
     * Breeze configuration and module setup
     *********************************************************/

    var $q, ajaxAdapter, breeze, em, EntityQuery, tester = null;

    var testFns = window.testFns,
        handleFail = testFns.failed;

    // Create this 'testApp' module once per file unless changing it
    testFns.create_testAppModule();

    beforeEach(function () {
        tester = ngMidwayTester('testApp');
        breeze = tester.inject('breeze');
        $q = tester.inject('$q');
        EntityQuery = breeze.EntityQuery;
        ajaxAdapter = breeze.config.getAdapterInstance('ajax');
        ajaxAdapter.requestInterceptor = null;
        em = testFns.create_appEntityManager(tester.inject);
    });

    afterEach(function () {
        // destroy the tester after each test
        tester.destroy();
        tester = null;
    });

    it("can get all customers w/o interceptor", function (done) {
        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).catch(handleFail).finally(done);

        function success(data) {
            var count = data.results.length;
            expect(count).toBeGreaterThan(0);
        }
    });


    it("can get faked customer response with interceptor", function (done) {
        ajaxAdapter.requestInterceptor = interceptor;
        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).catch(handleFail).finally(done);

        function interceptor(requestInfo) {
            requestInfo.config = null; // by-pass the real service
            var cfg = customer3QuerySuccess;
            requestInfo.success(cfg.data, cfg.statusText, cfg.headers, requestInfo.config);
        }
        function success(data) {
            // should be 3 faked customers
            expect(data.results.length).toEqual(3);
        }
    });

    it("can timeout with interceptor", function(done) {
        ajaxAdapter.requestInterceptor = interceptor;
        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).catch(expectedFail).finally(done);

        function interceptor(requestInfo) {
            // using resolved promise because integer timeout isn't always fast enough during tests
            requestInfo.config.timeout = $q.when(true);
            //requestInfo.config.timeout = 1; // "immediate" timeout (1 is min; 0 is ignored)

        }
        function success() {
            expect.toFail("query should timeout but didn't");
        }
        function expectedFail(error) {
            var emsg = error.message;
            expect(emsg).toMatch(/timeout/);
        }
    });

    it("can create cancel option with interceptor", function(done) {

        var canceller = new Canceller($q); // Canceller defined among helpers

        ajaxAdapter.requestInterceptor = function (requestInfo) {
            requestInfo.config.timeout = canceller.promise;
        };

        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).catch(expectedFail)
            .finally(fin);

        // cancel immediately for purposes of this test
        canceller.cancel("testing");

        function success() {
            expect.toFail("query should cancel but didn't");
        }
        function expectedFail(error) {
            var emsg = error.message;
            expect(emsg).toMatch(/timeout/);
        }
        function fin(){
            canceller.close();
            // the app shouldn't reuse the interceptor
            // because its canceller has been "spent"
            ajaxAdapter.requestInterceptor = null;
            canceller.promise.then(function(reason) {
                console.log("Cancel reason was: "+reason);
                done();
            })
        }
    });

    it("long timeout won't interfere with query", function(done) {
        ajaxAdapter.requestInterceptor = interceptor;
        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).catch(fail).finally(done);

        function interceptor(requestInfo) {
            requestInfo.config.timeout = 10000;  // 10 seconds
        }
        function success(data) {
            expect(data.results.length).toBeGreaterThan(0);
        }
        function fail(error) {
            if (error.status === 0) {
               expect.toFail("got status===0 which we interpret as unexpected query timeout");
            } else {
                handleFail(error);
            }
        }
    });

    it("interceptor.oneTime flag prevents its reuse", function(done) {
        ajaxAdapter.requestInterceptor = interceptor;
        interceptor.oneTime = true;

        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).catch(expectedFail);

        function interceptor(requestInfo) {
            // using resolved promise because integer timeout isn't always fast enough during tests
            requestInfo.config.timeout = $q.when(true);
            //requestInfo.config.timeout = 1; // "immediate" timeout
        }
        function success() {
            expect.toFail("1st query should timeout but didn't");
            done(); // this sync test is OVER
        }
        function expectedFail(error) {
            error.message = "1st query: "+error.message;
            if (error.status === 0) {
                // we interpret status===0 as "timeout"
                // try query again; the interceptor should be gone
                EntityQuery.from("Customers")
                    .using(em).execute()
                    .then(success2).catch(fail2)
                    .finally(done);
            } else {
                handleFail(error);
                done();
            }
        }
        function success2(data) {
            expect(data.results.length).toBeGreaterThan(0);
        }
        function fail2(error) {
            if (error.status === 0) {
                expect.toFail("2nd query returned status===0 which we interpret as unexpected timeout");
            } else {
                handleFail(error);
            }
        }
    });

    /*** Helpers ***/
    function noop() {}

    // An example you might try in your app
    function Canceller($q) {
        var canceller = this;
        var _cancelled = false;
        var deferred = $q.defer();
        canceller.cancelled = function() {return _cancelled;};
        canceller.promise = deferred.promise;
        canceller.cancel = function (reason) {
            deferred.resolve(reason);
            canceller.cancel = noop;
            _cancelled = true;
        };
        canceller.close = function(){
            deferred.resolve('closed');
            canceller.cancel = noop;
        }
    }

    // successFn args as an array, grabbed from a real query for first 3 customers
    var customer3QuerySuccess = {
        data:    [{"firstName":"Derek","lastName":"Puckett","phone":"(954) 594-9355","email":"derek.puckett@vulputate.net","address":{"street":"P.O. Box 914, 9990 Dapibus St.","city":"Quam","state":"OH","zip":"55154"},"_id":"51f06ded06a7baa417000001"},{"firstName":"Bernard","lastName":"Russell","phone":"(203) 652-0465","email":"bernard.russell@torquentper.com","address":{"street":"324-6843 Dolor Ave","city":"Quis","state":"FL","zip":"28034"},"_id":"51f06ded06a7baa417000002"},{"firstName":"Jordan","lastName":"Jimenez","phone":"(265) 520-8354","email":"jordan.jimenez@variusorciin.co.uk","address":{"street":"Ap #370-9242 Sed, Ave","city":"Lorem","state":"OR","zip":"88091"},"_id":"51f06ded06a7baa417000003"}],
        status:  200,
        headers: getHeadersFn({
            "Content-Type": "application/json, text/html; charset=utf-8",
            "Content-Length": 696,
            "etag": "-1072212393"
        })
    };

    function getHeadersFn(headers) {
        return function (headerName) {
            if (headerName && headerName.length > 0) {
                return headers[headerName];
            } else {
                return headers;
            }
        };
    }

});