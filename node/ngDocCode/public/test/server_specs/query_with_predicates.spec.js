/* jshint -W117, -W030, -W109 */
describe("query_with_predicates:", function () {
    'use strict';

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var gotNoResults = ash.gotNoResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);
    var Predicate = breeze.Predicate;

    ash.serverIsRunningPrecondition();
    ash.setupNgMidwayTester('testApp');

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    ///////////////////////////
    it("a single 'equals' predicate", function (done) {

        // looking for customers in London
        var pred = new Predicate('City', '==', 'London');

        // alternative filter query operation choices
        // var pred = new Predicate('City', 'eq', 'London');
        // var pred = new Predicate('City', FilterQueryOp.Equals, 'London');

        var q = EntityQuery.from('Customers').where(pred);

        em.executeQuery(q).then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(c) {
                expect(c.City).to.equal('London', c.CompanyName+' is in '+ c.City);
            });
        }
    });

    it("an OR predicate", function (done) {

        // looking for customers in London or Paris
        var pred = new Predicate('City', '==', 'London')
                             .or('City', '==', 'Paris');

        var q = EntityQuery.from('Customers').where(pred);

        em.executeQuery(q).then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(c) {
                expect(c.City).to.match(/(London)|(Paris)/, c.CompanyName+' is in '+ c.City);
            });
        }

    });
    /*
    // Query using withParameters

    asyncTest("can query 'withParameters'", function () {
        expect(2);
        var em = newEm();
        var query = EntityQuery.from("CustomersStartingWith")
            .withParameters({ companyName: "qu"});

        em.executeQuery(query).then(success).fail(handleFail).fin(start);

        function success(data) {
            var results = data.results, len = results.length;
            ok(len, "should have customers; got " + len);
            var qu = 0;
*/
//            results.forEach(function (c) { qu += /qu.*/i.test(c.CompanyName()); });
/*
            ok(len === qu, "all of them should begin 'Qu'");
        }
    });

     // Combination of IQueryable and withParameters

    asyncTest("can query combining 'withParameters' and filter", function () {
        expect(3);
        var em = newEm();
        var query = EntityQuery.from("CustomersStartingWith")
            .where('Country', 'eq', 'Brazil')
            .withParameters({ companyName: "qu" });

        em.executeQuery(query).then(success).fail(handleFail).fin(start);

        function success(data) {
            var results = data.results, len = results.length;
            ok(len, "should have customers; got " + len);
            var qu = 0;
*/
//            results.forEach(function (c) { qu += /qu.*/i.test(c.CompanyName()); });
/*
            ok(len === qu, "all of them should begin 'Qu'");
            var brazil = 0;
            results.forEach(function (c) { brazil += c.Country() === "Brazil"; });
            ok(len === brazil, "all of them should be in Brazil");
        }
    });
*/
});
