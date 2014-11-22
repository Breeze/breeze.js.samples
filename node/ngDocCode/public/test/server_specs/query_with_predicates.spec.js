/* jshint -W117, -W030, -W109 */
describe("query_with_predicates:", function () {
    'use strict';

    var customerType;
    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var gotNoResults = ash.gotNoResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);
    var orderType;
    var Predicate = breeze.Predicate;

    ash.serverIsRunningPrecondition();

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
        customerType = em.metadataStore.getEntityType('Customer');
        orderType =    em.metadataStore.getEntityType('Order');
    });

    ///////////////////////////
    it("a single 'equals' predicate", function (done) {

        // looking for customers in London
        var pred = new Predicate('City', '==', 'London');

        // alternative filter query operation choices
        // var pred = Predicate.create('City', '==', 'London');
        // var pred = new Predicate('City', 'eq', 'London');
        // var pred = new Predicate('City', FilterQueryOp.Equals, 'London');

        logPredicate(pred, customerType);

        EntityQuery.from('Customers')
            .where(pred)
            .using(em).execute().then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(c) {
                expect(c.City).to.equal('London', c.CompanyName+' is in '+ c.City);
            });
        }
    });

    it("a single 'equals' predicate on Complex type property", function (done) {

        // looking for Orders shipped to California
        var pred = new Predicate('ShipTo.Region', '==', 'CA');


        logPredicate(pred, orderType);

        EntityQuery.from('Orders')
            .where(pred)
            .using(em).execute().then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(o) {
                var orderLabel = 'Order {0} - {1}'.format(o.OrderID, o.ShipName);
                expect(o.ShipTo.Region).to.equal('CA', orderLabel);
            });
        }
    });

    it("a date function predicate", function (done) {

        // looking for orders in 1996
        var pred = new Predicate('year(OrderDate)', '==', 1996);

        EntityQuery.from('Orders')
            .where(pred)
            .using(em).execute().then(success).then(done, done);

        function success(data){
            // can log the OData predicate from the query too
            logPredicate(data.query.wherePredicate, orderType);

            gotResults(data);
            data.results.forEach(function(o) {
                var order = 'Order {0} - {1}'.format(o.OrderID, o.ShipName);
                expect(o.OrderDate.getFullYear()).to.equal(1996, order);
            });
        }
    });

    it("an OR string predicate", function (done) {

        // looking for customers in London or Paris
        var pred = new Predicate('City', '==', 'London')
                             .or('City', '==', 'Paris');

        logPredicate(pred, customerType);

        EntityQuery.from('Customers')
            .where(pred)
            .using(em).execute().then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(c) {
                expect(c.City).to.match(/(London)|(Paris)/, c.CompanyName+' is in '+ c.City);
            });
        }

    });

    it("an AND predicate", function (done) {

        // Make sure date is in UTC (like the datetimes in the database)
        var testDate = new Date(Date.UTC(1998, 3, 1)); // month counts from zero!

        // Looking for Orders ordered after April'98 AND freight > 100
        var p1 = new Predicate('OrderDate', '>', testDate);
        var p2 = new Predicate('Freight', '>', 100);

        var pred = p1.and(p2);

        // Alternatives
        //   var pred = Predicate.and([p1, p2]);

        //   var pred = Predicate
        //           .create('Freight', '>', 100)
        //           .and('OrderDate', '>', testDate);

        logPredicate(pred, orderType);

        EntityQuery.from('Orders')
            .where(pred)
            .using(em).execute().then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(o) {
                var order = 'Order {0} - {1} freight: {2}, ordered: {3}'
                    .format(o.OrderID, o.ShipName, o.Freight, o.OrderDate);
                expect(o.OrderDate).above(testDate, order);
                expect(o.Freight).above(100, order);
            });
        }
    });

    it("triple AND predicate", function (done) {

        // Looking for Orders ordered in 1996 AND freight > 100
        var jan1996 = new Date(Date.UTC(1996, 0, 1)), // Jan===0 in JavaScript
            jan1997 = new Date(Date.UTC(1997, 0, 1));

        var pred = Predicate
            .create('OrderDate', '>=', jan1996)
            .and(   'OrderDate', '<',  jan1997)
            .and(   'Freight',   '>',  100);

        logPredicate(pred, orderType);

        EntityQuery.from('Orders')
            .where(pred)
            .using(em).execute().then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(o) {

                var order = 'Order {0} - {1} freight: {2}, ordered: {3}'
                    .format(o.OrderID, o.ShipName, o.Freight, o.OrderDate);

                expect(o.OrderDate.getFullYear()).equal(1996, order);
                expect(o.Freight).above(100, order);

            });
        }
    });

    it("mix of OR/AND", function (done) {

        // Looking for Orders ordered in any year EXCEPT 1996 ... AND freight > 100
        var jan1996 = new Date(Date.UTC(1996, 0, 1)), // Jan===0 in JavaScript
            jan1997 = new Date(Date.UTC(1997, 0, 1));

        var pred = Predicate
            .create('OrderDate', '<',  jan1996)
            .or(    'OrderDate', '>=', jan1997)
            .and(   'Freight',   '>',  100);

        logPredicate(pred, orderType);

        EntityQuery.from('Orders')
            .where(pred)
            .using(em).execute().then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(o) {

                var order = 'Order {0} - {1} freight: {2}, ordered: {3}'
                    .format(o.OrderID, o.ShipName, o.Freight, o.OrderDate);

                expect(o.OrderDate.getFullYear()).not.equal(1996, order);
                expect(o.Freight).above(100, order);

            });
        }
        // jshint -W101
        /*
         See also http://stackoverflow.com/questions/24053168/how-do-i-write-a-breeze-predicate-equivalent-to-the-following-sql/24068591#24068591

         Noteworthy:

         1) The **left-to-right composition of the predicates**.

         a) The `create` call predicate creates the date-gte predicate

         b) The `or` call returns a predicate which is the OR of the 1st predicate and
         the 2nd date condition. This is the OR predicate

         c) The third `and` call returns the AND of the OR-predicate and the Freight condition.

         2) This predicate isn't associated with Order.
         Could apply to any query for a type with 'OrderDate' and 'Freight' properties.

         3) Using `new Date(Date.UTC(...))` to specify dates that are
         a) unambiguous in the face of international differences for date literals
         b) have no time values (and we hope the db doesn't have them either)
         c) are created as UTC dates to avoid timezone issues

         4) This is the verbose alternative:

         var p1 = breeze.Predicate
         .create("OrderDate", ">=", new Date(Date.UTC(1996, 0, 1))) // Jan===0 in JavaScript
         .and("OrderDate", "<", new Date(Date.UTC(1997, 0, 1)));

         var p2 = new breeze.Predicate("Freight", ">", 100);

         return p1.and(p2);

         5) Someday, when we have date function support, we could write this version of p1

         var p1 = new breeze.Predicate("year(OrderDate)", FilterQueryOp.Equals, 1996);

         */
        // jshint +W101
    });

    it("a NOT predicate", function (done) {
        // Looking for Orders with freight <= 100
        // NEGATE a predicate of freight > 100
        var p1 = new Predicate('Freight', '>', 100);

        var pred = p1.not();
        //  pred = Predicate.not(p1);

        logPredicate(pred, orderType);

        EntityQuery.from('Orders')
            .where(pred)
            .using(em).execute().then(success).then(done, done);


        function success(data){
            gotResults(data);
            data.results.forEach(function(o) {
                var order = 'Order {0} - {1}'.format(o.OrderID, o.ShipName);
                expect(o.Freight).at.most(100, order);
            });
        }
    });

    it("an ANY predicate", function (done) {

        // Get first Order with any OrderDetail for product with the known 'Chai'
        // Instead of 'any' can say 'some' or use FilterQueryOp.Any
        var pred = new Predicate('OrderDetails', 'any', 'ProductID', '==', ash.chaiProductID);

        logPredicate(pred, orderType);

        EntityQuery.from('Orders')
            .where(pred)
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

    it("an ANY predicate through a many-to-many mapping table", function (done) {

        // Get first Order with an OrderDetail that has a product named "chai"
        // OrderDetail is the mapping table in this scenario:
        //     Order <-(1,M)-> OrderDetail <-(M,1)-> Product

        var pred = new Predicate('OrderDetails', 'any', 
                                 'Product.ProductName', 'eq', 'Chai');

        logPredicate(pred, orderType);

        EntityQuery.from('Orders')
            .where(pred)
            .top(1)
            .expand('OrderDetails.Product')
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var order = data.results[0] || {};
            var hasChai = order.OrderDetails.some(function(od){
                return od.Product.ProductName ===  'Chai';
            });
            expect(hasChai).to.be.true;
        }
    });

    // Skip until D#2638 is fixed
    it.skip("an ANY predicate with a function value D#2638", function (done) {

        // Get first Customer with an Order in 1996
        var pred = Predicate.create('Orders', 'any', 'year(OrderDate)', '==', 1996);

        EntityQuery.from('Customers')
            .where(pred)
            .top(1)
            .expand('Orders')
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var customer = data.results[0] || {};
            var ordersIn1996 = customer.Orders.filter(function(o){
                return o.OrderDate.getFullYear() ===  1996;
            });
            expect(ordersIn1996).is.not.empty;
        }
    });

    // Refactor once D#2638 is fixed
    it("a composite ANY predicate", function (done) {

        // Get first Customer with an Order in 1996 and Freight > 100

        // The following predicate will work when D#2638 is fixed
        // var p1 = Predicate.create('Freight', '>', 1000).and('year(OrderDate)', '==', 1996);

        // until then try this:
        var p1 = Predicate.create('OrderDate', '>=', new Date(Date.UTC(1996, 0, 1)))
                          .and(   'OrderDate', '<',  new Date(Date.UTC(1997, 0, 1)))
                          .and(   'Freight',   '>', 100);

        var pred = new Predicate('Orders', 'any', p1);

        EntityQuery.from('Customers')
            .where(pred)
            .top(1)
            .expand('Orders')
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var customer = data.results[0] || {};
            var ordersIn1996WithBigFreight = customer.Orders.filter(function(o){
                return o.Freight > 100 && o.OrderDate.getFullYear() ===  1996;
            });
            expect(ordersIn1996WithBigFreight).is.not.empty;
        }
    });

    it("an ALL predicate", function (done) {

        // Get first Order whose every OrderDetail cost < 100
        // Instead of 'all' can say 'every' or use FilterQueryOp.All
        var pred = new Predicate('OrderDetails', 'all', 'UnitPrice',  '<', 100);

        logPredicate(pred, orderType);

        var query = EntityQuery.from('Orders')
            .where(pred)
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

    it("a nested ANY + ALL predicate", function (done){
        // Look for a Customer with any Order whose every OrderDetail has a unit price of more than $200.00.
        var pred = new Predicate('Orders', 'any', 'OrderDetails', 'all', 'UnitPrice', '>', 200);

        logPredicate(pred, customerType);

        EntityQuery.from('Customers')
            .where(pred)
            .top(1)
            .expand('Orders.OrderDetails')
            .using(em).execute().then(success).then(done, done);

        function success(data){
            var customer = data.results[0] || {};
            // customer orders whose every OrderDetail has a UnitPrice > 200
            var matchingOrders = customer.Orders.some(function(o){
                var count = o.OrderDetails.length;
                return count === o.OrderDetails.filter( function(od){ return od.UnitPrice > 200; }).length;
            });
            expect(matchingOrders).is.not.empty;
        }
    });

    ////// helpers //////

    function logPredicate(predicate, entityType){
        return; 
        /* Don't log now but could if/when want to see the query's OData query string
        var msg = 'query_with_predicates: OData query string is "$filter=' +
            predicate.toODataFragment(entityType)+'" for predicate "'+
            predicate.toString()+ '"');
        console.log(msg);
        */
    }
});
