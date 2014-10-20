/* jshint -W117, -W030, -W106, -W109 */
describe("query_with_expand:", function () {
    'use strict';

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var gotNoResults = ash.gotNoResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    ash.serverIsRunningPrecondition();

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    /////////////

    // Demonstrates a "nested query"
    it("include related parent entity, e.g. an Order's Customer", function (done) {
        // Get the first Order with a non-null CustomerID
        // and its related parent Customer
        EntityQuery.from("Orders")
            .where('CustomerID', '!=', null)
            .top(1)
            .expand('Customer')
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var order = data.results[0] || {};
            // expand means we can navigate to the parent customer in cache
            expect(order).has.property('Customer').that.exist;
        }
    });
});
