/* jshint -W117, -W030, -W106, -W109 */
describe("query_with_select (projection):", function () {
    'use strict';

    ash.serverIsRunningPrecondition();

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    it("select a property", function (done) {
        // Select Region names
        // NO Distinct option. Would have to remove duplicates yourself
        EntityQuery.from('Regions')
            .select('RegionDescription')
            .using(em).execute()
            .then(success)
            .then(done, done);

        function success(data){
            // log the results
            // console.log(data.results.map( function(r){return r.RegionDescription.trim();}).join(', '));
            gotResults(data);
        }
    });

    it("select a property from filtered query", function (done) {
        // Select company name of Customers starting w/ 'C'
        // NO Distinct option. Would have to remove duplicates yourself
        EntityQuery.from('Customers')
            .where('CompanyName', 'startsWith', 'C')
            .select('CompanyName')
            .using(em).execute()
            .then(success)
            .then(done, done);

        function success(data){
            // log the results
            // console.log(data.results.map(function(c){return c.CompanyName;}).join(', '));
            gotResults(data);
        }
    });

    it("select several properties from filtered query", function (done) {
        // Select {ID, Name, Contact} of Customers starting w/ 'C'
        EntityQuery.from('Customers')
            .where('CompanyName', 'startsWith', 'C')
            .select('CustomerID, CompanyName, ContactName')
            .using(em).execute()
            .then(success)
            .then(done, done);

        function success(data){
            // console.log(data.results.map(function(c){
            //     return '{0} {1} - {2}'.format(c.CustomerID, c.CompanyName, c.ContactName);
            // }).join(', '));

            gotResults(data);
            expect(Object.keys(data.results[0])).eqls(['CustomerID', 'CompanyName', 'ContactName']);
        }
    });

    it("select a collection navigation property; property values are entities in cache", function (done) {
        // Select the related Order entities of Customers starting w/ 'C'
        // The selected Orders are full entities; they will be in cache.
        EntityQuery.from('Customers')
            .where('CompanyName', 'startsWith', 'C')
            .select('Orders')
            .using(em).execute()
            .then(success)
            .then(done, done);

        function success(data){
            gotResults(data);
            expect(data.results[0]).has.property('Orders');
            expect(data.results[0].Orders[0] || {})
                .has.property('entityAspect', undefined, 'first selected Order is an entity and has entityAspect');
            expect(em.getEntities('Customer')).length(0,'should NOT have any cached Customers');
            expect(em.getEntities('Order')).length.above(0,'should have cached Orders');
        }
    });


    it("select data properties and a scalar navigation property", function (done) {
        // Select the related Customer entities of some 1996 Orders.
        // The selected Customers are full entities; they will be in cache.
        EntityQuery.from('Orders')
            .where('year(OrderDate)', '==', '1996')
            .select('OrderID, OrderDate, Customer')
            .using(em).execute()
            .then(success)
            .then(done, done);

        function success(data){
            gotResults(data);
            var orderProjection = data.results[0];
            expect(Object.keys(orderProjection)).eqls(['OrderID', 'OrderDate', 'Customer']);

            // Projected 'order' object is not an entity and lacks metadata
            // therefore the projected OrderDate property value is a string, NOT a Date
            expect(typeof orderProjection.OrderDate).equal('string');

            data.results.forEach(function(o){
                // get the year from the OrderDate
                expect(new Date(o.OrderDate).getFullYear()).equal(1996, 'OrderDate year');
                if (o.Customer){
                    expect(o.Customer).has.property('entityAspect', undefined,
                        'Order\'s Customer is a cached entity and has entityAspect');
                }
            });
        }
    });
});
