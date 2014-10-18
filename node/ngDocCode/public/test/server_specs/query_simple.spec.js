/* jshint -W117, -W030, -W109 */
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
describe("query_simple:", function () {
    'use strict';

    var testFns = window.docCode.testFns;

    testFns.serverIsRunningPrecondition();
    testFns.setupNgMidwayTester('testApp');

    var EntityQuery = breeze.EntityQuery;
    var em;
    var newEm = testFns.newEmFactory(testFns.northwindServiceName);

    var alfredsID = testFns.wellKnownData.alfredsID;
    var alfredsPredicate = // filter by the Alfreds Customer
            breeze.Predicate.create("CustomerID", "==", alfredsID);

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });
    ///////////////////////////

    describe("query for all customers", function () {

        it("using EntityManager.executeQuery - style #1", function (done) {
            var query = EntityQuery.from('Customers'); // create query style #1 ... our favorite

            // the one time in this file that we'll create a manager from scratch
            // use newEm() thereafter.
            var em = new breeze.EntityManager(testFns.northwindServiceName);

            em.executeQuery(query)
                .then(assertGotCustomers)
                .then(done, done);
        });

        function assertGotCustomers(data) {
            var count = data.results.length;
            expect(count).to.be.above(0, 'customer query returned ' + count);
        }

        /********************************************************************
         * We'll use the `em` set in the beforeEach hook from this point forward
         * so that we don't keep making server calls for metadata
         ********************************************************************/

        it("using EntityManager.executeQuery - style #2", function (done) {
            var query = new EntityQuery('Customers'); // Create query style #2
            em.executeQuery(query)
                .then(assertGotCustomers)
                .then(done, done);
        });

        // deprecated style: use promises instead
        it("using EntityManager.executeQuery - legacy callback style #3", function (done) {
            var query = new EntityQuery.from("Customers"); // Create query style #3
            em.executeQuery(query,
                function (data) {   // success callback
                    assertGotCustomers(data);
                    done();        // resume test runner
                },
                done       // failure callback (mocha takes the exception and reports it
            );
        });

        // the most common pattern that we see
        it("using EntityQuery.execute", function (done) {
            // Usually we have the manager already, long before composing the query
            // later construct query and execute it using that manager
            // in a single statement
            EntityQuery.from('Customers')
                .using(em).execute()
                .then(assertGotCustomers)
                .then(done, done);
        });
    });

    describe("when write a callback timeout", function () {
        /*********************************************************
         * Show how you could create a timeout such that
         * you ignored the Breeze query callback (if/when you get it)
         * if the query exceeds a timeout value
         *
         * This timeout governs the callbacks!
         * It doesn't stop the server from sending the data
         * nor does it stop the Breeze EntityManager from processing a response
         * that arrives after the promise is resolved.
         *
         * If you want that behavior, AND YOU PROBABLY DO, see the ngAjaxAdapter.spec
         *********************************************************/

        it("short timeout cancels 'all customers' query callback", function (done) {
            var timeoutMs = 1; // ridiculously short ... should time out
            allCustomerTimeoutQuery(done, timeoutMs, true);
        });

        it("long timeout allows 'all customers' query callback", function (done) {
            var timeoutMs = 100000; // ridiculously long ... should succeed
            allCustomerTimeoutQuery(done, timeoutMs, false);
        });

        function allCustomerTimeoutQuery (done, timeoutMs, shouldTimeout) {

            var expectTimeoutMsg = shouldTimeout ?
                " when should timeout." : " when should not timeout.";

            var query = new EntityQuery().from("Customers").using(em);
            var queryFinished = false;

            setTimeout(queryTimedout, timeoutMs);
            query.execute()
                .then(queryFinishedBeforeTimeout)
                .catch(queryFailed);

            function queryFailed(error){
                if (queryFinished) {return;} // dealt with it already
                queryFinished = true;
                done(error);
            }
            function queryFinishedBeforeTimeout(data) {
                if (queryFinished) {return;} // dealt with it already
                queryFinished = true;
                var count = data.results.length;
                try {
                    expect(shouldTimeout).to.equal(false,
                        "Query succeeded and got {0} records; {1}.".format(count, expectTimeoutMsg));
                    done();
                } catch (e){
                    done(e);
                }
            }

            function queryTimedout() {
                if (queryFinished) {return;} // dealt with it already
                queryFinished = true;
                expect(shouldTimeout).to.equal(true,"Query timed out" + expectTimeoutMsg);
                done()
            }
        }
    });

});
