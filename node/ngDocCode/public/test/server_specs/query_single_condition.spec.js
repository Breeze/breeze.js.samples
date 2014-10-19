/* jshint -W117, -W030, -W106, -W109 */
describe("query_single_condition:", function () {
    'use strict';

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var gotNoResults = ash.gotNoResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    ash.serverIsRunningPrecondition();
    ash.setupNgMidwayTester('testApp');

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    ///////////////////////////

    it("where ID equals", function (done) {
        EntityQuery.from('Customers')
            .where('CustomerID', '==', ash.alfredsID)

            // Filter query operation alternatives
            // see http://www.breezejs.com/sites/all/apidocs/classes/FilterQueryOp.html
            // .where('CustomerID', 'eq', ash.alfredsID)
            // .where('CustomerID', breeze.FilterQueryOp.Equals, ash.alfredsID)

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
            .where('CustomerID', '==', ash.emptyGuid)
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
                expect(name).to.match(/^[aA]/,
                  'CompanyName {0} does not start with "A"'.format(name));
            });
        }
    });

    it("where numeric property greaterThan", function (done) {
        EntityQuery.from('Orders')

            .where('Freight', '>', 100)
            // .where('Freight', breeze.FilterQueryOp.GreaterThan, 0)

            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function (o) {
                expect(o.Freight).to.be.above(100,
                    'Freight of order {0} to {1} is {2}'
                        .format(o.OrderID, o.ShipName, o.Freight));
            });
        }
    });

    it("where date property is on or after", function (done) {

        // Make sure date is in UTC (like the datetimes in the database)
        // testDate is 1/1/1998 at midnight GMT
        var testDate = new Date(Date.UTC(1998, 0, 1)); // month counts from zero!

        EntityQuery.from('Orders')

            .where('OrderDate', '>=', testDate)
            // .where('Freight', breeze.FilterQueryOp.GreaterThanOrEqual, testDate)

            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function (o) {
                expect(o.OrderDate).to.be.at.least(testDate,
                    'OrderDate of order {0} to {1} is {2}'
                        .format(o.OrderID, o.ShipName, o.OrderDate.toUTCString()));
            });
        }
    });

    it("where date property is exactly equal", function (done) {

        // Make sure date is in UTC (like the datetimes in the database)
        // testDate is 1/1/1998 at 9am GMT
        var testDate = new Date(Date.UTC(1998, 0, 1, 9)); // month counts from zero!

        EntityQuery.from('Orders')
            .where('OrderDate', '==', testDate)
            .using(em).execute()
            .then(gotNoResults).then(done, done);
    });

    it("where two date properties are compared", function (done) {
        // Looking for Orders shipped after they were required
        EntityQuery.from('Orders')
            .where('ShippedDate', '>=', 'RequiredDate')
            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function (o) {
                expect(o.ShippedDate).to.be.at.least(o.RequiredDate,
                    'For order {0} to {1} ShippedDate {2} is before RequiredDate {3}'
                        .format(o.OrderID, o.ShipName, o.ShippedDate.toUTCString(), o.RequiredDate.toUTCString()));
            });
        }
    });

    it("where two string properties are compared", function (done) {
        EntityQuery.from('Employees')
            .where('FirstName', '==', 'LastName')
            .using(em).execute()
            .then(gotNoResults).then(done, done);
    });

    it("where string property is compared to a value object", function (done) {
        // Breeze will interpret a string value as a property name
        // if the value happens to correspond to a property name
        // Eliminate all possible ambiguity by building a predicate with an object value
        EntityQuery.from('Employees')
            // We're looking for a person with the first name of 'LastName'
            // Hey ... it could happen :-)
            .where('FirstName', '==',
                  { value: 'LastName', isLiteral: true, dataType: breeze.DataType.String })
            .using(em).execute()
            .then(gotNoResults).then(done, done);
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

    it("can filter nullable number property", function (done) {
        // Order.EmployeeID is nullable int; can still filter on it.
        EntityQuery.from('Orders')
            .where('EmployeeID', '==', ash.nancyID)
            .using(em).execute()
            .then(gotResults).then(done, done);
    });

    it("can filter nullable Guid property", function (done) {
        // Order.CustomerID is nullable guid; can still filter on it.
        EntityQuery.from('Orders')
            .where('CustomerID', '==', ash.alfredsID)
            .using(em).execute()
            .then(gotResults).then(done, done);
    });

    it("can filter with string function 'contains'", function (done) {
        EntityQuery.from('Customers')
            // looking for customers whose names contain the word 'market', ignoring case
            .where('CompanyName', 'contains', 'market')

            //.where("CompanyName", FilterQueryOp.Contains, 'market');    // Alternatives,
            //.where("substringof(CompanyName,'market')", "eq", true);    // equivalent in OData
            //.where("indexOf(toLower(CompanyName),'market')", "ne", -1); // to this

            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(c){
                expect(c.CompanyName).to.match(/market/i, c.CompanyName);
            });
        }
    });

    it("can filter with string function 'length'", function (done) {
        EntityQuery.from('Customers')
            .where('length(CompanyName)', '>', 30)
            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(c){
                expect(c.CompanyName.length).above(30, c.CompanyName);
            });
        }
    });

    it("can filter with string function combinations", function (done) {
        EntityQuery.from('Customers')
            // looking for customers whose names have 'om' as 2nd and 3rd letter, ignoring case
            .where('toUpper(substring(CompanyName, 1, 2))', '==', 'OM')
            .using(em).execute()
            .then(success).then(done, done);

        function success(data){
            gotResults(data);
            data.results.forEach(function(c){
                expect(c.CompanyName).to.match(/^.om/i, c.CompanyName);
            });
        }
    });

    it("where property is a ComplexType property", function (done) {
        // Looking for Orders shipped to CA
        var query = EntityQuery.from("Orders")
            .where("ShipTo.Region", "==", "CA")
            .using(em).execute()
            .then(success).then(done, done);

        function success(data) {
            data.results.forEach(function(o){
                var msg = "({0}) '{1}' has ShipTo.Region of '{2}'".format(
                           o.OrderID, o.ShipName, o.ShipTo.Region);
                expect(o)
                    .has.deep.property('ShipTo.Region')
                    .that.equals('CA', msg);
            });
        }
    });

    // Todo: move to projections spec
    it("where property is a ComplexType property with projection result", function (done) {
        // Looking for Orders shipped to CA
        var query = EntityQuery.from("Orders")
            .where("ShipTo.Region", "==", "CA")
            .expand("Customer")
            .select("OrderID, Customer.CompanyName, ShipTo.Region")
            .using(em).execute()
            .then(success).then(done, done);

        function success(data) {
            data.results.forEach(function(o){
                var msg = "({0}) '{1}' was shipped to '{2}'".format(
                    // Notice that breeze creates projected property names by
                    // flattening the navigation paths using "_" as a separator
                    // (whether path is based on EntityType or ComplexType)
                    o.OrderID, o.Customer_CompanyName, o.ShipTo_Region);
                expect(o)
                    .has.property('ShipTo_Region')
                    .that.equals('CA', msg);
            });
        }
    });

    it("EntityQuery.fromEntityKey", function (done) {
        // See http://www.breezejs.com/sites/all/apidocs/classes/EntityQuery.html#method_fromEntityKey
        var customerType = em.metadataStore.getEntityType("Customer");
        var key = new breeze.EntityKey(customerType, ash.alfredsID);

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
        // See http://www.breezejs.com/sites/all/apidocs/classes/EntityManager.html#method_getEntityByKey
        em.fetchEntityByKey('Customer',ash.alfredsID)
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

    // Todo: move to a different query spec as topic is not simple
    describe("when queried entity is already in cache in Deleted state", function () {
        beforeEach(function () {
            // fake alfreds customer in cache in a deleted state
            em.createEntity('Customer', {
                CustomerID: ash.alfredsID,
                CompanyName: "Alfreds"
            }, breeze.EntityState.Deleted);
        });

        // These tests fail until clear D#2636 and F#2256
        it.skip("entity is excluded from query result D#2636", function (done) {
            // although the 'Alfreds' Customer is in the db,
            // breeze excludes from results because it is in cache in a deleted state.
            EntityQuery.from('Customers')
                .where('CustomerID', '==', ash.alfredsID)
                .using(em).execute()
                .then(gotNoResults)
                .then(done, done);
        });

        it.skip("entity is included when includeDeleted=true F#2256", function (done) {

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
    it("can run queries in parallel with $q.all and preserve response order", function (done) {
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
});
