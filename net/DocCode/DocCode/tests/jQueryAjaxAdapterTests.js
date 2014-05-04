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
 * These tests explore some of these possibilities, using the jQuery ajax adapter
 ********************************/
 (function (testFns) {
     "use strict";

     /*********************************************************
     * Breeze configuration and module setup 
     *********************************************************/
     var handleFail = testFns.handleFail;
     var EntityQuery = breeze.EntityQuery;

     var ajaxAdapter;
     var serviceName = testFns.northwindServiceName;
     var newEm = testFns.newEmFactory(serviceName);
     var origAdapterName = breeze.config.getAdapterInstance('ajax').name;

     var beforeEach = {
         setup: function() {
             ajaxAdapter = breeze.config.initializeAdapterInstance('ajax', 'jQuery', true);
             ajaxAdapter.requestInterceptor = null;
             testFns.populateMetadataStore(newEm);
         },
         teardown: function() {
             breeze.config.initializeAdapterInstance('ajax', origAdapterName, true);
         }
     };

     module("jQueryAjaxAdapter tests (requestInterceptor)", beforeEach);

     asyncTest("can get all customers w/o interceptor", 1, function () {
         EntityQuery.from("Customers")                
           .using(newEm()).execute()
           .then(success).catch(handleFail).finally(start);             

         function success(data) {
             var count = data.results.length;
             ok(count > 0, "customer query returned " + count);
         }
     });

     asyncTest("can get faked customer response with interceptor", 1, function () {
         ajaxAdapter.requestInterceptor = interceptor;
         EntityQuery.from("Customers")
           .using(newEm()).execute()
           .then(success).catch(handleFail).finally(start);

         function interceptor(requestInfo) {
             requestInfo.config = null; // by-pass the real service
             requestInfo.success.apply(null, customer3QuerySuccess);
         }
         function success(data) {
             equal(data.results.length, 3, "faked customer query returned  customers.");
         }
     });

     asyncTest("can timeout with interceptor", 1, function () {
         ajaxAdapter.requestInterceptor = interceptor;
         EntityQuery.from("Customers")
           .using(newEm()).execute()
           .then(success).catch(expectedFail).finally(start);

         function interceptor(requestInfo) {
             requestInfo.config.timeout = 1; // "immediate" timeout (1 is min; 0 is ignored)
         }
         function success() {
             ok(false, "query should timeout but didn't");
         }
         function expectedFail(error) {
             var emsg = error.message;
             ok(/timeout/.test(emsg),
             "query timeout as expected with msg='{0}'".format(emsg));                                
         }
     });

     asyncTest("can create cancel option with interceptor", 1, function () {

         var canceller = new Canceller(); // Canceller defined among helpers
         ajaxAdapter.requestInterceptor = interceptor(canceller);

         EntityQuery.from("Customers")
             .using(newEm()).execute()
             .then(success).catch(expectedFail)
             .finally(fin);

         // cancel immediately for purposes of this test
         canceller.cancel("testing");

         // imagine an interceptor factory such as this
         function interceptor(canceller) {
             return function (requestInfo) {
                 canceller.requestInfo = requestInfo;
             }
         }

         function success() {
             ok(false, "query should cancel but didn't");
         }
         function expectedFail(error) {
             var emsg = error.message;
             ok(/abort/.test(emsg),
             "query canceled as expected with msg='{0}'".format(emsg));
         }
         function fin() {
             // the app shouldn't reuse the interceptor
             // because its canceller has been "spent"
             ajaxAdapter.requestInterceptor = null;
             start();
         }
     });

     asyncTest("long timeout won't interfere with query", 1, function () {
         ajaxAdapter.requestInterceptor = interceptor;
         EntityQuery.from("Customers")
           .using(newEm()).execute()
           .then(success).catch(fail).finally(start);

         function interceptor(requestInfo) {
             requestInfo.config.timeout = 10000;  // 10 seconds
         }
         function success() {
             ok(true, "query did not timeout");
         }
         function fail(error) {
             var emsg = error.message;
             if (/timeout/.test(emsg)) {
                 ok(false, "unexpected query timeout with msg='{0}'".format(emsg));
             } else {
                 handleFail(error);
             }
         }
     });

     asyncTest("interceptor.oneTime flag prevents its reuse", 1, function () {
         ajaxAdapter.requestInterceptor = interceptor;
         interceptor.oneTime = true;

         EntityQuery.from("Customers")
           .using(newEm()).execute()
           .then(success).catch(expectedFail);

         function interceptor(requestInfo) {
             requestInfo.config.timeout = 1; // "immediate" timeout 
         }
         function success() {
             ok(false, "1st query should timeout but didn't");
             start(); // this async test is OVER
         }
         function expectedFail(error) {
             var emsg = error.message;
             if (/timeout/.test(emsg)) {
                 // try query again; the interceptor should be gone
                 EntityQuery.from("Customers")
                   .using(newEm()).execute()
                   .then(success2).catch(fail2)
                   .finally(start);
             } else {
                 handleFail(error);
                 start();
             };
         }
         function success2() {
             ok(true, "1st query timedout, but 2nd query did not timeout");
         }
         function fail2(error) {
             var emsg = error.message;
             if (/timeout/.test(emsg)) {
                 ok(false, "unexpected 2nd query timeout with msg='{0}'".format(emsg));
             } else {
                 handleFail(error);
             }
         }
     });

     /*** Helpers ***/
     // An example you might try in your app
     function Canceller() {
         var canceller = this;
         var _cancelled = false;
         this.cancelled = function () { return _cancelled; }
         this.requestInfo = null; // to be set by requestInterceptor
         this.cancel = function (reason) {
             var jqxhr = canceller.requestInfo && canceller.requestInfo.jqXHR;
             if (!jqxhr) {
                 throw new Error("Canceller lacks jQuery XHR so can't call abort()");
             }
             jqxhr.abort();
             _cancelled = true;
         };
     }

     // successFn args as an array, grabbed from a real query for first 3 customers
     var customer3QuerySuccess = [
         /*data*/       [{ "$id": "1", "$type": "Northwind.Models.Customer, DocCode.Models", "CustomerID": "729de505-ea6d-4cdf-89f6-0360ad37bde7", "CompanyName": "Die Wandernde Kuh", "ContactName": "Rita Müller", "ContactTitle": "Sales Representative", "Address": "Adenauerallee 900", "City": "Stuttgart", "Region": null, "PostalCode": "70563", "Country": "Germany", "Phone": "0711-020361", "Fax": "0711-035428", "RowVersion": null, "Orders": null }, { "$id": "2", "$type": "Northwind.Models.Customer, DocCode.Models", "CustomerID": "cd98057f-b5c2-49f4-a235-05d155e636df", "CompanyName": "Suprêmes délices", "ContactName": "Pascale Cartrain", "ContactTitle": "Accounting Manager", "Address": "Boulevard Tirou, 255", "City": "Charleroi", "Region": null, "PostalCode": "B-6000", "Country": "Belgium", "Phone": "(071) 23 67 22 20", "Fax": "(071) 23 67 22 21", "RowVersion": null, "Orders": null }, { "$id": "3", "$type": "Northwind.Models.Customer, DocCode.Models", "CustomerID": "9d4d6598-b6c2-4b52-890b-0636b23ec85b", "CompanyName": "Franchi S.p.A.", "ContactName": "Paolo Accorti", "ContactTitle": "Sales Representative", "Address": "Via Monte Bianco 34", "City": "Torino", "Region": null, "PostalCode": "10100", "Country": "Italy", "Phone": "011-4988260", "Fax": "011-4988261", "RowVersion": null, "Orders": null }],
         /*statusText*/ "200 OK",
         /*jqXHR*/      new jqXHR(200, {
                            "Content-Type": "application/json; charset=utf-8",
                            "Content-Length": 1200
                        })];

     function jqXHR(status, headers, responseText) {
         this.status = status;
         this.getResponseHeader = function(headerName) {
             return headers[headerName] || null;
         };
         this.getAllResponseHeaders = function() {
             return headers;
         };
         this.responseText = responseText;
     }
        
 })(docCode.testFns);