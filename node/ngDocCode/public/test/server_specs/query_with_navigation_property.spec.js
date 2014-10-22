/* jshint -W117, -W030, -W106, -W109 */
describe("query_with_navigation_property:", function () {
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

    describe("entity with PARENT entity property", function () {

        it("that equals a value", function (done) {
            // Get first order shipped to California with its parent customer
            // Demonstrates "nested query" which is filtering on a related entity
            EntityQuery.from('Orders')
                .where('Customer.Region', '==', 'CA')
                .top(1)
                .expand('Customer')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var order = data.results[0] || {};
                // expand means we can navigate to the parent customer in cache
                expect(order).has.property('Customer')
                    .that.has.property('Region', 'CA');
            }
        });

        it("that 'startsWith' a value", function (done) {
            // Get Orders of Customer's whose name starts with 'Alfred'
            EntityQuery.from('Orders')
                .where('Customer.CompanyName', 'startsWith', 'Alfred')
                .expand('Customer')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                gotResults(data);
                data.results.forEach(function(o){
                    var orderLabel = 'Order {0} - {1}'.format(o.OrderID, o.ShipName);
                    expect(o.Customer.CompanyName).to.match(/^alfred/i, orderLabel);
                });

            }
        });

        it("that is null", function (done) {
            // Get first order shipped to California with its parent customer
            // Demonstrates "nested query" which is filtering on a related entity
            EntityQuery.from('Orders')
                .where('Customer.Region', '==', null)
                .top(1)
                .expand('Customer')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var order = data.results[0] || {};
                // expand means we can navigate to the parent customer in cache
                expect(order).has.property('Customer')
                    .that.has.property('Region', null);
            }
        });
    });

    describe("entity with ANY CHILD entity that has", function () {

        it("a given property value", function (done) {

            // Get first Order with any OrderDetail for product with the known "chai" ID
            var query = EntityQuery.from('Orders')
                // Instead of 'any' can say 'some' or use FilterQueryOp.Any
                .where('OrderDetails', 'any', 'ProductID',  '==', ash.chaiProductID)
                .top(1)
                .expand('OrderDetails')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var order = data.results[0] || {};
                var chaiOrderDetail = order.OrderDetails.filter(function(od){
                    return od.ProductID ===  ash.chaiProductID;
                });
                expect(chaiOrderDetail).is.not.empty;
            }
        });

        it("a property value greaterThan 'x'", function (done) {
            // Get first Customer with any order whose freight cost > 1000
            var query = EntityQuery.from('Customers')
                .where('Orders', 'any', 'Freight',  '>', 1000)
                .top(1)
                .expand('Orders')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var customer = data.results[0] || {};
                // expand means we can navigate to the child orders in cache
                var ordersInCA = customer.Orders.filter(function(o){
                    return o.Freight > 1000;
                });
                expect(ordersInCA).is.not.empty;
            }
        });

        it("a given navigation property value", function (done) {

            // Get first Order with any OrderDetail for a product named "Chai"
            var query = EntityQuery.from('Orders')
                .where('OrderDetails', 'any', 'Product.ProductName', 'contains', 'chai')
                .top(1)
                .expand('OrderDetails.Product')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var order = data.results[0] || {};
                var chaiOrderDetail = order.OrderDetails.filter(function(od){
                    return /chai/i.test(od.Product.ProductName);
                });
                expect(chaiOrderDetail).is.not.empty;
            }
        });

        // Fails. Skipping. D#2637
        it.skip("a given complex property value D#2637", function (done) {
            // Get first Customer with any order shipped to California
            EntityQuery.from('Customers')
                .where('Orders', 'any', 'ShipTo.Region', '==', 'CA')
                .top(1)
                .expand('Orders')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var customer = data.results[0] || {};
                // expand means we can navigate to the child orders in cache
                var ordersInCA = customer.Orders.filter(function(o){
                    return o.Location.Region === 'CA';
                });
                expect(ordersInCA).is.not.empty;
            }
        });
    });

    describe("entity whose EVERY CHILD entity has", function () {

        it("a property value greaterThan 'x'", function (done) {
            // Get first Order whose every OrderDetail cost < 100
            var query = EntityQuery.from('Orders')
                // Instead of 'every' can say 'all' or use FilterQueryOp.All
                .where('OrderDetails', 'every', 'UnitPrice',  '<', 100)
                .top(1)
                .expand('OrderDetails')
                .using(em).execute().then(success).then(done, done);

            function success(data){
                var order = data.results[0] || {};
                var shipName = order.ShipName;
                order.OrderDetails.forEach(function(od){
                    var detail = 'OrderID: {0} ProductID: {1} ShipName: {2}'
                        .format(od.OrderID, od.ProductID, shipName);
                    expect(od.UnitPrice).below(100, detail);
                });
            }
        });

    });
});
