/* jshint -W117, -W030, -W109 */
describe("query_xtras:", function () {
    'use strict';

    ash.serverIsRunningPrecondition();

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    /////////////

    describe("'.withParameters'", function () {

        it("set one parameter", function (done) {
            // Looking for Customers whose company name begins "qu", ignoring case
            // The 'CustomersStartingWith' endpoint
            // expects a 'companyName' URL query string parameter
            var query = EntityQuery.from('CustomersStartingWith')
                .withParameters({ companyName: 'qu'});

            em.executeQuery(query).then(success).then(done, done);

            function success(data) {
                gotResults(data);
                data.results.forEach(function(c){
                    expect(c.CompanyName).to.match(/^qu/i);
                });
            }
        });

        it("set one parameter (nested query API example)", function (done) {
            // Orders with an OrderDetail for a specific product
            // Demonstrates "nested query" filtering on a collection navigation
            // Can do with 'ANY' client query
            // But in this case we let the controller's "OrdersForProduct" method do it
            // That method also includes the related Customer and OrderDetails

            var query = EntityQuery.from('OrdersForProduct/?productID=' + ash.chaiProductID);

            em.executeQuery(query)
                .then(success)
                .then(done, done);

            function success(data) {
                gotResults(data);
                data.results.forEach(function(o){
                    var cust = o.Customer || {CompanyName: '<no customer>'};

                    var chaiItems = o.OrderDetails.filter(
                        function (od) { return od.ProductID === ash.chaiProductID; }
                    );
                    var orderLabel ='{0}-{1} order has {2} chai product details'
                        .format(o.OrderID, cust.CompanyName, chaiItems.length);
                    expect(chaiItems.length).above(0, orderLabel);
                });
            }
        });

        it("hack the query string instead ", function (done) {
            // Looking for Customers whose company name begins "qu", ignoring case
            // The 'CustomersStartingWith' endpoint
            // expects a 'companyName' URL query string parameter
            // Hack the query string rather than use .withParameters
            // it's up to you to get it right.
            var query = EntityQuery.from('CustomersStartingWith/?companyName=qu');

            em.executeQuery(query).then(success).then(done, done);

            function success(data) {
                gotResults(data);
                data.results.forEach(function(c){
                    expect(c.CompanyName).to.match(/^qu/i);
                });
            }
        });

        it("combined with breeze filter", function (done) {
            // The 'CustomersStartingWith' endpoint
            // expects a 'companyName' URL query string parameter
            // and understands OData query syntax.
            // Looking for Customers whose company name begins "qu", ignoring case,
            // and located in 'Brazil'
            var query = EntityQuery.from('CustomersStartingWith')
                .withParameters({ companyName: 'qu'})
                .where('Country', 'eq', 'Brazil');

            em.executeQuery(query).then(success).then(done, done);

            function success(data) {
                gotResults(data);
                data.results.forEach(function(c){
                    expect(c.CompanyName).to.match(/^qu/i);
                    expect(c.Country).to.equal('Brazil');
                });
            }
        });

    });

    describe("when write a callback timeout", function () {
        /*********************************************************
         * N.B. Prefer technique in the ngAjaxAdapter.spec#"can timeout with interceptor"
         *
         * Show how you might create a timeout such that
         * you ignored the Breeze query callback (if/when you get it)
         * if the query exceeds a timeout value
         *
         * This timeout governs the callbacks!
         * It doesn't stop the server from sending the data
         * nor does it stop the Breeze EntityManager from processing a response
         * that arrives after the promise is resolved.
         *
         * If you want that behavior, AND YOU PROBABLY DO,
         * see the ngAjaxAdapter.spec instead !
         *********************************************************/

        it("short timeout cancels 'all customers' query callback", function (done) {
            var timeoutMs = 1; // ridiculously short ... should time out
            allCustomerTimeoutQuery(done, timeoutMs, true);
        });

        it("long timeout allows 'all customers' query callback", function (done) {
            var timeoutMs = 100000; // ridiculously long ... should succeed
            allCustomerTimeoutQuery(done, timeoutMs, false);
        });

        function allCustomerTimeoutQuery (done, timeoutMs, shouldTimeout) {

            var expectTimeoutMsg = shouldTimeout ?
                " when should timeout." : " when should not timeout.";

            var query = new EntityQuery().from("Customers").using(em);
            var queryFinished = false;

            setTimeout(queryTimedout, timeoutMs);
            query.execute()
                .then(queryFinishedBeforeTimeout)
                .catch(queryFailed);

            function queryFailed(error){
                if (queryFinished) {return;} // dealt with it already
                queryFinished = true;
                done(error);
            }
            function queryFinishedBeforeTimeout(data) {
                if (queryFinished) {return;} // dealt with it already
                queryFinished = true;
                var count = data.results.length;
                try {
                    expect(shouldTimeout).to.equal(false,
                        "Query succeeded and got {0} records; {1}.".format(count, expectTimeoutMsg));
                    done();
                } catch (e){
                    done(e);
                }
            }

            function queryTimedout() {
                if (queryFinished) {return;} // dealt with it already
                queryFinished = true;
                expect(shouldTimeout).to.equal(true,"Query timed out" + expectTimeoutMsg);
                done();
            }
        }
    });

    describe("when queried entity is already in cache in Deleted state", function () {
        beforeEach(function () {
            // fake alfreds customer in cache in a deleted state
            em.createEntity('Customer', {
                CustomerID: ash.alfredsID,
                CompanyName: "Alfreds"
            }, breeze.EntityState.Deleted);
        });

        it("entity is excluded from query result", function (done) {
            // although the 'Alfreds' Customer is in the db,
            // breeze excludes from results because it is in cache in a deleted state.
            EntityQuery.from('Customers')
                .where('CustomerID', '==', ash.alfredsID)
                .using(em).execute()
                .then(ash.gotNoResults)
                .then(done, done);
        });

        it("entity is included when includeDeleted=true F#2256", function (done) {

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

    it("can run queries in parallel with $q.all and preserve response order", function (done) {
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

    describe("when refreshing cached entities with 'EntityQuery.fromEntities'", function() {
        var emp1;
        var UNCHANGED = breeze.EntityState.Unchanged;

        beforeEach(function() {
            // simulate an unchanged employee in cache
            emp1 = em.createEntity('Employee', {
              EmployeeID: 1,
              FirstName: 'Eeny',
              LastName: 'Beany'
            }, UNCHANGED);
        });

        it("can refresh an unmodified Employee entity", function(done) {
            // Using 'fromEntities method'
            EntityQuery.fromEntities([emp1])
                .using(em).execute()
                .then(function() {
                    expect(emp1.FirstName).to.match(/Nancy/i,
                      "should update FirstName from db");
                })
                .then(done, done);
        });

        it("can refresh an unmodified Customer entity", function(done) {
             var cust = em.createEntity('Customer',
                {CustomerID: ash.alfredsID, CompanyName: 'Acme'}, UNCHANGED);

            EntityQuery.fromEntities(cust) // can skip the array if only one
                .using(em).execute()
                .then(function() {
                     expect(cust.CompanyName).to.match(/Alfreds/i,
                      "should update CompanyName from db");
                })
                .then(done, done);
        });

        it("can refresh unmodified entities of the same type", function(done) {
            var names = ['Meeny', 'Miney', 'Moe'];
            var emps = makeFakeEmps(names);
            EntityQuery.fromEntities(emps)
                .using(em).execute()
                .then(function() {
                    emps.forEach(function(e, i) {
                        expect(e.FirstName).to.not.equal(
                            names[i], "should update FirstName from db");
                    });
                })
                .then(done, done);
        });

        // D#2655
        it("can NOT refresh entities of different types", function() {
            var cust = em.createEntity('Customer',
                {CustomerID: ash.alfredsID, CompanyName: 'Acme'}, UNCHANGED);

            expect(function(){
               var q = EntityQuery.fromEntities([emp1, cust]);
            }).to.throw(/not of type/,
                "raised error because not all entities are the same type");
        });

        it("will NOT refresh a modified entity", function(done) {
            emp1.FirstName = 'Changed';
            expect(emp1.entityAspect.entityState.isModified())
                .to.be.true;

            EntityQuery.fromEntities([emp1])
                .using(em).execute()
                .then(function() {
                    expect(emp1.FirstName).to.equal('Changed',
                      "should NOT update with FirstName from db");
                })
                .then(done, done);
        });

        it("will refresh a modified entity if 'OverwriteChanges'", function(done) {
            emp1.FirstName = 'Changed';
            expect(emp1.entityAspect.entityState.isModified())
                .to.be.true;

            EntityQuery.fromEntities([emp1])
                .using(breeze.MergeStrategy.OverwriteChanges)
                .using(em).execute()
                .then(function() {
                    expect(emp1.FirstName).to.match(/Nancy/i,
                      "should update with FirstName from db");
                })
                .then(done, done);
        });

        // fake a few entities with known IDs
        function makeFakeEmps(names) {
            var emps = [];
            names.forEach(function (name, i){
                var e = {
                  EmployeeID: i + 2,
                  FirstName: name,
                  LastName: 'Beany'
                };
                emps.push(
                    em.createEntity('Employee', e, UNCHANGED)
                );
            });
            return emps;
        }
    });

    describe("breeze wires-up related entities", function () {
        var eQuery, etQuery, oQuery;

        beforeEach(function () {
            eQuery  = EntityQuery.from('Employees')
                .where('EmployeeID', '==', ash.nancyID).using(em); // Nancy Davolio

            etQuery = EntityQuery.from('EmployeeTerritories').using(em);

            oQuery  = EntityQuery.from('Orders')
                .where('EmployeeID', '==', ash.nancyID).using(em); // Nancy's orders
        });

        it("when queries run in parallel", function (done) {
            var promises =[eQuery, etQuery, oQuery].map(function(q){ return q.execute();});
            breeze.Q.all(promises)
                .then(expectNancyWiredUp)
                .then(done, done);
        });

        it("when queries are chained", function (done) {
            // Orders, then ETerritories, then Employee
            oQuery.execute()
                .then(function(){return etQuery.execute();})
                .then(function(){return eQuery.execute();})
                .then(expectNancyWiredUp)
                .then(done, done);
        });

        function expectNancyWiredUp(){
            var emps           = em.executeQueryLocally(eQuery);
            var empTerritories = em.executeQueryLocally(etQuery);
            var orders         = em.executeQueryLocally(oQuery);

            expect(emps).to.be.length(1, 'should have one Employee (Nancy)');
            var nancy = emps[0];
            expect(orders).length.above(0, 'Orders in cache');
            expect(orders).length(nancy.Orders.length, 'same as # of nancy.Orders');
            expect(empTerritories).length.above(0, 'EmployeeTerritories in cache');
            expect(nancy.EmployeeTerritories).length.above(0, 'nancy.EmployeeTerritories');
        }
    });

});