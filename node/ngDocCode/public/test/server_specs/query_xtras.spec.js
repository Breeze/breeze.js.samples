/* jshint -W117, -W030, -W109 */
describe("query_xtras:", function () {
    'use strict';

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    /////////////

    describe("when write a callback timeout", function () {
        /*********************************************************
         * N.B. Prefer technique in the ngAjaxAdapter.spec#"can timeout with interceptor"
         *
         * Show how you might create a timeout such that
         * you ignored the Breeze query callback (if/when you get it)
         * if the query exceeds a timeout value
         *
         * This timeout governs the callbacks!
         * It doesn't stop the server from sending the data
         * nor does it stop the Breeze EntityManager from processing a response
         * that arrives after the promise is resolved.
         *
         * If you want that behavior, AND YOU PROBABLY DO,
         * see the ngAjaxAdapter.spec instead !
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
                done();
            }
        }
    });

    // Skipping these tests; they'll fail until we clear D#2636 and F#2256
    describe.skip("when queried entity is already in cache in Deleted state", function () {
        beforeEach(function () {
            // fake alfreds customer in cache in a deleted state
            em.createEntity('Customer', {
                CustomerID: ash.alfredsID,
                CompanyName: "Alfreds"
            }, breeze.EntityState.Deleted);
        });

        it("entity is excluded from query result D#2636", function (done) {
            // although the 'Alfreds' Customer is in the db,
            // breeze excludes from results because it is in cache in a deleted state.
            EntityQuery.from('Customers')
                .where('CustomerID', '==', ash.alfredsID)
                .using(em).execute()
                .then(gotNoResults)
                .then(done, done);
        });

        it("entity is included when includeDeleted=true F#2256", function (done) {

            // // Base queryOptions on the QueryOptions class default
            // var queryOption = new breeze.QueryOptions({ includeDeleted: true });

            // Base queryOptions on this manager's default QueryOptions
            var queryOptions = em.queryOptions.using({ includeDeleted: true });

            EntityQuery.from('Customers')
                .where('CustomerID', '==', ash.alfredsID)
                .using(queryOptions)
                .using(em).execute()
                .then(gotResults)
                .then(done, done);
        });
    });

    it("can run queries in parallel with $q.all and preserve response order", function (done) {
        /*********************************************************
         * Dealing with response order of parallel queries
         * The order in which the server responds is not predictable
         * but promise library ensures order of the results
         *
         * It's difficult to make the server flip the response order
         * (run it enough times and the response order will flip)
         * but the logic of this test manifestly deals with it
         * because of the way it assigns results.
         *********************************************************/
        var arrived = [];

        var queries = [
            EntityQuery.from('Customers').where('CompanyName', 'startsWith', 'a'),
            EntityQuery.from('Customers').where('CompanyName', 'startsWith', 'c'),
            EntityQuery.from('Customers').where('CompanyName', 'startsWith', 's'),
            EntityQuery.from('Customers').where('CompanyName', 'startsWith', 't')
        ];

        var promises = queries.map(function(q, i){
            return em.executeQuery(q).finally(function(){arrived.push(i);});
        });

        // breeze.Q is $q
        breeze.Q.all(promises)
            // called when ALL promises have been fulfilled
            .then(function(responses){
                // Completion order is unpredictable. Uncomment and re-run several times to see for yourself
                // console.log("Order of parallel query responses was " + JSON.stringify(arrived));

                // regardless, the promise responses are in the same order as the queries
                responses.forEach(function(res, rix){
                    var qix = queries.indexOf(res.query);
                    expect(qix).to.equal(rix,
                            'response ' + rix + ' was for query ' +
                            qix + ' ' + res.query.wherePredicate.toString());
                });
            })
            .then(done,done);
    });

    describe("'.withParameters'", function () {
        it("set one parameter", function (done) {
            // The 'CustomersStartingWith' endpoint
            // expects a 'companyName' URL query string parameter
            // Looking for Customers whose company name begins "qu", ignoring case
            var query = EntityQuery.from('CustomersStartingWith')
                .withParameters({ companyName: 'qu'});

            em.executeQuery(query).then(success).then(done, done);

            function success(data) {
                gotResults(data);
                data.results.forEach(function(c){
                    expect(c.CompanyName).to.match(/^qu/i);
                });
            }
        });

        it("combined with breeze filter", function (done) {
            // The 'CustomersStartingWith' endpoint
            // expects a 'companyName' URL query string parameter
            // and understands OData query syntax.
            // Looking for Customers whose company name begins "qu", ignoring case,
            // and located in 'Brazil'
            var query = EntityQuery.from('CustomersStartingWith')
                .withParameters({ companyName: 'qu'})
                .where('Country', 'eq', 'Brazil');

            em.executeQuery(query).then(success).then(done, done);

            function success(data) {
                gotResults(data);
                data.results.forEach(function(c){
                    expect(c.CompanyName).to.match(/^qu/i);
                    expect(c.Country).to.equal('Brazil');
                });
            }
        });

    });

});