/* jshint -W117, -W030, -W109 */
describe("query_simple:", function () {
    'use strict';

    ash.serverIsRunningPrecondition();

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });
    ///////////////////////////

    describe("query for customers", function () {

        it("using EntityManager.executeQuery - style #1", function (done) {
            var query = EntityQuery.from('Customers'); // create query style #1 ... our favorite

            // the one time in this file that we'll create a manager from scratch
            // use newEm() thereafter.
            var em = new breeze.EntityManager(ash.northwindServiceName);

            em.executeQuery(query)
                .then(gotResults)
                .then(done, done);
        });

        /********************************************************************
         * Use the `em` (reset in the beforeEach hook) from this point forward
         * so that we don't keep asking the server for metadata
         ********************************************************************/

        it("using EntityManager.executeQuery - style #2", function (done) {
            var query = new EntityQuery('Customers'); // Create query style #2
            em.executeQuery(query)
                .then(gotResults)
                .then(done, done);
        });

        // deprecated style: use promises instead
        it("using EntityManager.executeQuery - legacy callback style #3", function (done) {
            var query = new EntityQuery.from("Customers"); // Create query style #3
            em.executeQuery(query,
                function (data) {   // success callback
                    gotResults(data);
                    done();        // resume test runner
                },
                done       // failure callback (mocha takes the exception and reports it
            );
        });

        // a common alternative to EntityManager.executeQuery; both are good.
        it("using EntityQuery.execute", function (done) {
            // Usually we have the manager already, long before composing the query
            // later construct query and execute it using that manager
            // in a single statement
            EntityQuery.from('Customers')
                .using(em).execute()
                .then(gotResults)
                .then(done, done);
        });

    });

    describe("query for first supplier", function () {

        var query = EntityQuery.from('Suppliers').top(1);

        it("should return exactly one supplier", function (done) {
            query.using(em).execute()
                .then( function (data) {
                    expect(data.results).has.length(1);
                })
                .then(done, done);
        });

        it("should have a complex Location.Address", function (done) {

            query.using(em).execute()
                .then( function (data) {
                    expect(data.results[0] || {})
                        .has.deep.property('Location.Address')
                        .that.is.not.empty;
                })
                .then(done, done);
        });
    });

});
