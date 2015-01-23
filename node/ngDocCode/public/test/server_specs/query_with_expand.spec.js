/* jshint -W117, -W030, -W106, -W109 */
describe("query_with_expand:", function () {
    'use strict';

    ash.serverIsRunningPrecondition();

    var em;
    var EntityQuery = breeze.EntityQuery;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    /////////////

    it("include related parent entity, e.g. an Order's Customer", function (done) {
        // Get Alfreds' first Order and its related parent 'Alfreds' Customer
        EntityQuery.from("Orders")
            .where('CustomerID', '==', ash.alfredsID)
            .expand('Customer')
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var order = data.results[0] || {};
            // expand means we can navigate to the parent customer in cache
            expect(order).has.property('Customer').that.exist;
        }
    });

    it("include related parent entity which has a complex type property, e.g. an Product's Supplier", function (done) {
        // Get first Product and its related parent Supplier which has a complex Location property
        EntityQuery.from("Products")
            .top(1)
            .expand('Supplier')
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var product = data.results[0] || {};
            var pid = product.ProductID;
            // expand means we can navigate to the parent Supplier in cache
            expect(product).has.property('Supplier',undefined,'Supplier of Product '+pid)
                .that.has.deep.property('Location.City', undefined,
                    'Supplier.Location.City of Product '+pid).that.exist;
        }
    });

    it("include related parent and child entities, e.g. an Order's Customer and Details", function (done) {
        // Get Alfreds' first Order and its related entities
        EntityQuery.from("Orders")
            .where('CustomerID', '==', ash.alfredsID)
            .expand('Customer, OrderDetails')// separated by ','
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var order = data.results[0] || {};
            var oid = order.OrderID;
            // expand means we can navigate to the parent customer in cache
            expect(order).has.property('Customer', undefined, 'Customer of {0}'.format(oid)).that.exist;
            // an child OrderDetails in cache
            expect(order).has.property('OrderDetails')
                .that.has.length.above(0,'OrderDetails of '+oid);
        }
    });

    it("include related child entities and their children, e.g. an Order's  Details and their Products",
        function (done) {
            // Get Alfreds' first Order and its related entities
            EntityQuery.from("Orders")
                .where('CustomerID', '==', ash.alfredsID)
                .expand('OrderDetails.Product') // dotted navigation (a two-legged expand) gets both
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var order = data.results[0] || {};
                var oid = order.OrderID;
                // an child OrderDetails in cache
                expect(order).has.property('OrderDetails')
                    .that.has.length.above(0,'OrderDetails of '+oid);
                order.OrderDetails.forEach(function(od){
                    expect(od).has.property('Product',undefined,
                        'Product of Detail {0}-{1}'.format(oid, od.ProductID)).that.exist;
                });
            }
    });
});
