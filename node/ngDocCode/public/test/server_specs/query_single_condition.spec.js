/* jshint -W117, -W030, -W109 */
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
describe.only("query_single_condition:", function () {
    'use strict';

    var testFns = window.docCode.testFns;

    testFns.serverIsRunningPrecondition();
    testFns.setupNgMidwayTester('testApp');

    var EntityQuery = breeze.EntityQuery;
    var em;
    var newEm = testFns.newEmFactory(testFns.northwindServiceName);

    var alfredsID = testFns.wellKnownData.alfredsID;

    var gotResults = function (data) {
        expect(data.results).is.not.empty;
    };
    var gotNoResults = function (data) {
        expect(data.results).is.empty;
    };

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    ///////////////////////////

    it("where ID equals", function (done) {
        EntityQuery.from('Customers')
            .where('CustomerID', '==', alfredsID)

            // query operation alternatives
            // .where('CustomerID', 'eq', alfredsID)
            // .where('CustomerID', breeze.FilterQueryOp.Equals, alfredsID)

            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            expect(data.results).has.length(1); // exactly one result
            var customer = data.results[0] || {};
            expect(customer).has.property('CompanyName').that.match(/alfreds/i);
        }
    });

    it("where query can return no results as an empty array", function (done) {
        EntityQuery.from('Customers')
            .where('CustomerID', '==', testFns.wellKnownData.emptyGuid)
            .using(em).execute()
            .then(gotNoResults).then(done, done);
    });

    it("where string property startsWith", function (done) {
        EntityQuery.from('Customers')
            .where('CompanyName', 'startsWith', 'A')
            // .where('CompanyName', breeze.FilterQueryOp.StartsWith, 'A')

            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function (c) {
                var name = c.CompanyName;
                expect(name).to.match(/[aA]/,
                  'CompanyName {0} does not start with "A"'.format(name));
            });
        }
    });


    it("where null", function (done) {
        EntityQuery.from('Customers')
            .where('Region', '==', null)
            .using(em).execute()
            // many customers have a null Region
            .then(gotResults).then(done, done);
    });


    it("where not null", function (done) {
        EntityQuery.from('Customers')

            .where('Region', '!=', null)
            //.where('Region', 'ne', null)
            //.where('Region', breeze.FilterQueryOp.NotEquals, null)

            .using(em).execute()
            // many customers have a Region
            .then(gotResults).then(done, done);
    });

    it("EntityQuery.fromEntityKey", function (done) {

        var customerType = em.metadataStore.getEntityType("Customer");
        var key = new breeze.EntityKey(customerType, alfredsID);

        EntityQuery.fromEntityKey(key)
            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            expect(data.results).has.length(1); // exactly one result
            var customer = data.results[0] || {};
            expect(customer).has.property('CompanyName').that.match(/alfreds/i);
        }
    });

    it("EntityManager.fetchEntityByKey", function (done) {
        em.fetchEntityByKey('Customer', alfredsID)
            .then(success).then(done, done);

        function success(data){
            // N.B.: the query response data object does NOT have a results property
            expect(data).to.not.have.property('results');
            // it has an 'entity' property
            expect(data)
                .has.property('entity')
                .that.has.property('CompanyName')
                .that.match(/alfreds/i);
        }
    });
});
