/* jshint -W117, -W030, -W109 */
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
describe("query_simple:", function () {
    'use strict';

    var testFns = window.docCode.testFns;

    var alfredsID = testFns.wellKnownData.alfredsID;
    var alfredsPredicate = // filter by the Alfreds Customer
            breeze.Predicate.create("CustomerID", "==", alfredsID);
    var EntityQuery = breeze.EntityQuery;
    var isServerRunning;
    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);
    var pFail    = testFns.promiseFail,
        pSuccess = testFns.promiseSuccess;
    var tester;

    // TODO: Move to TestFns
    before(function(done){
        if (testFns.isServerRunning){
            done();
        } else {
            done(new Error("Server is not running; can't run these specs"));
        }
    });

    beforeEach(function() {
        tester = ngMidwayTester('testApp');
    });
    afterEach(function () {
        if (tester) { tester.destroy(); }
    });

    it("can query all customers with executeQuery", function (done) {
        var query = new EntityQuery('Customers');
            newEm().executeQuery(query)
                .then(pSuccess(done, assertGotCustomers))
                .catch(pFail(done));
    });

    function assertGotCustomers(data) {
        var count = data.results.length;
        expect(count).to.be.above(0, 'customer query returned ' + count);
    }
});
