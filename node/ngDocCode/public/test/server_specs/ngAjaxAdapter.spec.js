/* jshint -W117, -W030, -W109 */
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
 * - do http-service-specific stuff for this particular request e.g., set jQuery's 'cache' flag
 *   or setup an angular $http request cancel feature as explained here:
 *   http://odetocode.com/blogs/scott/archive/2014/04/24/canceling-http-requests-in-angularjs.aspx
 * - skip the AJAX service call by setting 'requestInfo.config' to null
 * - invoke the success or error callbacks immediately (best to abort the service call at the same time!)
 * - wrap or replace the success/error callbacks to change or supplement behavior
 *
 * These tests explore some of these possibilities, using the $http ajax adapter
 ********************************/
describe("ngAjaxAdapter:", function () {
    'use strict';

    var testFns = window.docCode.testFns;

    testFns.serverIsRunningPrecondition();
    var tester = testFns.setupNgMidwayTester('testApp');

    var ajaxAdapter  = breeze.config.getAdapterInstance('ajax');
    var EntityQuery = breeze.EntityQuery;
    var em;
    var newEm = testFns.newEmFactory(testFns.northwindServiceName);

    beforeEach(function () {
        em = newEm();
    });
    afterEach(function () {
        ajaxAdapter.requestInterceptor = null;
    });

    ///////////////////////////

    it("can get all customers w/o interceptor", function (done) {
        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).then(done, done);

        function success(data) {
            var count = data.results.length;
            expect(count).to.be.above(0, 'customer query returned ' + count);
        }
    });

    it("can get faked customer response with interceptor", function (done) {

        ajaxAdapter.requestInterceptor = function (requestInfo) {
            // skip the real Angular ajax call and
            // immediately invoke the breeze success callback with mock response data
            var ngConfig = requestInfo.config;
            var res = mockCustomerQueryResponse;
            requestInfo.success(res.data, res.status, res.headers, ngConfig, res.statusText);
            requestInfo.config = null; // causes by-pass of the real Angular ajax call
        };

        EntityQuery.from("Customers")
            .using(em).execute()
            .then(success).then(done, done);

        function success(data) {
            var count = data.results.length;
            expect(data.results.length).to.equal(3, 'faked customer query returned ' + count);
        }
    });

    it("can timeout with interceptor", function (done) {
        ajaxAdapter.requestInterceptor =  function (requestInfo) {
            requestInfo.config.timeout = 1; // "immediate" timeout (1 ms is minimum; 0 is ignored)
        };

        EntityQuery.from("Customers")
            .using(em).execute()
            .then(queryShouldNotSucceed, queryShouldTimeout)
            .then(done, done);

    });

    it("adequate timeout won't interfere with query", function (done) {

        ajaxAdapter.requestInterceptor = function (requestInfo) {
            requestInfo.config.timeout = 2000;
        };

        EntityQuery.from("Customers")
            .using(em).execute()
            .then(queryShouldSucceed, queryShouldNotFail)
            .then(done, done);
    });

    it("can create cancel option with interceptor", function (done) {
        var $q = tester().inject('$q');
        var canceller;

        ajaxAdapter.requestInterceptor = function (requestInfo) {
            canceller = $q.defer();
            requestInfo.config.timeout = canceller.promise;
        };

        EntityQuery.from("Customers")
            .using(em).execute()
            // cancel looks like a timeout
            .then(queryShouldNotSucceed, queryShouldTimeout)
            .then(done, done);

        if (canceller) {
            // cancel immediately for purposes of this test
            // by resolving the cancel promise
            canceller.resolve("user canceled");
            canceller = null; // not reusable
        }

    });

    it("query succeeds if you don't cancel", function (done) {
        var $q = tester().inject('$q');
        var canceller;

        ajaxAdapter.requestInterceptor = function (requestInfo) {
            canceller = $q.defer();
            requestInfo.config.timeout = canceller.promise;
        };

        EntityQuery.from("Customers")
            .using(em).execute()
            .then(queryShouldSucceed, queryShouldNotFail)
            .then(done, done);


        /* We succeeds because we don't cancel this time (we don't resolve the canceler deferred) */

    });

    it("interceptor.oneTime flag prevents interceptor reuse", function (done) {
        var em = newEm();

        ajaxAdapter.requestInterceptor = function (requestInfo) {
            requestInfo.config.timeout = 1; // immediate cancel!
        };

        // Set the interceptor's `oneTime` flag!!!
        // This prevents it from being used a second time
        // Comment out and watch the test fail
        ajaxAdapter.requestInterceptor.oneTime = true;

        var query = EntityQuery.from("Customers").using(em);

        query.execute()
            .then(queryShouldNotSucceed, expectedQuery1Fail)
            // try query again; the interceptor should be gone
            .then(requery)
            .then(query2Success, query2Fail)
            .then(done, done);

        function expectedQuery1Fail(error) {
            var response = error.httpResponse;
            var status = response.status;
            var data = response.data;
            if (status === 0 && /timeout/.test(data)) {
                return; // hooray
            } else {
                throw error; // some error other than the expected timeout
            }
        }

        function requery(){
            return query.execute();
        }

        function query2Success() {
            // this fn is useful only as a place to breakpoint when query #2 succeeds
        }

        function query2Fail(error) {
            var response = error.httpResponse;
            var status = response.status;
            var data = response.data;
            if(status === 0 && /timeout/.test(data)){
                expect(true).to.equal(false, 'query #2 timed-out unexpectedly');
            } else {
                throw error;
            }
        }
    });

    describe("(sad adapter)", function () {

        // Skip this test because it take a long time for connection to fail
        // Remove uncomment if you want to try it
        /*
        it("bad URL (no connection) should be caught in promise", function(done) {
            this.timeout(60000);
            var em = new breeze.EntityManager('/bad/address/');
            EntityQuery.from('Customers')
                .using(em).execute()
                .then(unexpectedSuccess, expectedFailure)
                .then(done, done);

            function unexpectedSuccess(data){
                expect(true).to.equal(false, 'query should have failed because of bad URL');
            }

            function expectedFailure(error) {
                // eat the error; can break here to see what it was
                expect(false).to.equal(false, 'query should have failed because of bad URL');
            }
        });
        */

        it("exception in ajax method should be caught in promise", function(done) {
            // Make the ajaxAdapter.ajax method throw when used
            var origAjax = ajaxAdapter.ajax;
            ajaxAdapter.ajax = function() { throw new Error('some error in the ajax method'); };

            EntityQuery.from('Customers')
                .using(em).execute()
                .then(unexpectedSuccess, expectedFailure)
                .then(done, done)
                .finally(restoreAjaxMethod);

            function unexpectedSuccess(data){
                expect(true).to.equal(false, 'query should have failed because of adapter exception');
            }

            function expectedFailure(error) {
                expect(error.message).to.match(/ajax method/, 'query failed w/ msg='+error.message);
            }
            function restoreAjaxMethod(){
                ajaxAdapter.ajax = origAjax;
            }
        });

        it("exception in interceptor should be caught in promise", function(done) {

            // Make the ajaxAdapter.requestInterceptor throw
            ajaxAdapter.requestInterceptor = function() { throw new Error('some error in the requestInterceptor'); };
            ajaxAdapter.requestInterceptor.oneTime = true;

            EntityQuery.from('Customers')
                .using(em).execute()
                .then(unexpectedSuccess, expectedFailure)
                .then(done, done);

            function unexpectedSuccess(data){
                expect(true).to.equal(false, 'query should have failed because of interceptor exception');
            }

            function expectedFailure(error) {
                expect(error.message).to.match(/requestInterceptor/, 'query failed w/ msg='+error.message);
            }
        });
    });

    /*** Helpers ***/

    function queryShouldSucceed(data) {
        expect(true).to.equal(true, 'query did not timeout');
    }

    function queryShouldTimeout(error) {
        var response = error.httpResponse;
        var status = response.status;
        var data = response.data;
        expect(status === 0 && data).match(/timeout/,
            'expected status==0 and data to contain "timeout"; status was {0} and data was "{1}"'
                .format(status, data));
    }

    function queryShouldNotSucceed(data) {
        expect(false).to.equal(true,"query should have timed-out but didn't");
    }

    function queryShouldNotFail(error) {
        var response = error.httpResponse;
        var status = response.status;
        var data = response.data;
        if(status === 0 && /timeout/.test(data)){
            expected(true).to.equal(false, 'timed-out unexpectedly');
        } else {
            throw error;
        }
    }

    // fake ajax adapter success object, grabbed from a real query for 3 customers
    var mockCustomerQueryResponse = {
        data:       [{ "$id": "1", "$type": "Northwind.Models.Customer, DocCode.Models", "CustomerID": "729de505-ea6d-4cdf-89f6-0360ad37bde7", "CompanyName": "Die Wandernde Kuh", "ContactName": "Rita Müller", "ContactTitle": "Sales Representative", "Address": "Adenauerallee 900", "City": "Stuttgart", "Region": null, "PostalCode": "70563", "Country": "Germany", "Phone": "0711-020361", "Fax": "0711-035428", "RowVersion": null, "Orders": null }, { "$id": "2", "$type": "Northwind.Models.Customer, DocCode.Models", "CustomerID": "cd98057f-b5c2-49f4-a235-05d155e636df", "CompanyName": "Suprêmes délices", "ContactName": "Pascale Cartrain", "ContactTitle": "Accounting Manager", "Address": "Boulevard Tirou, 255", "City": "Charleroi", "Region": null, "PostalCode": "B-6000", "Country": "Belgium", "Phone": "(071) 23 67 22 20", "Fax": "(071) 23 67 22 21", "RowVersion": null, "Orders": null }, { "$id": "3", "$type": "Northwind.Models.Customer, DocCode.Models", "CustomerID": "9d4d6598-b6c2-4b52-890b-0636b23ec85b", "CompanyName": "Franchi S.p.A.", "ContactName": "Paolo Accorti", "ContactTitle": "Sales Representative", "Address": "Via Monte Bianco 34", "City": "Torino", "Region": null, "PostalCode": "10100", "Country": "Italy", "Phone": "011-4988260", "Fax": "011-4988261", "RowVersion": null, "Orders": null }],
        headers:    getSuccessHeaders,
        status:     200,
        statusText: "200 OK"
    };

    function getSuccessHeaders(header){
        var headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": 1200
        };
        return header ? headers[header] || null : headers;
    }

});
