/* jshint -W117, -W030, -W109 */
describe("saveNorthwind:", function (done) {
    'use strict';

    ash.serverIsRunningPrecondition();

    var em;
    var EntityQuery = breeze.EntityQuery;
    var handleSaveFailed = ash.handleSaveFailed;
    var newEm = ash.newEmFactory(ash.northwindServiceName);
    var newGuidComb = ash.newGuidComb;
    var timestamp;

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
        timestamp = new Date().toISOString();
    });

    afterEach(function (done) {
    	ash.northwindReset(true).then(done, done);
    });

    /////////////

    it("can save nothing", function (done) {
        newEm().saveChanges()
            .then(function(saveResult) {
                expect(saveResult.entities).to.have.length(0,
                    'succeeded in saving nothing');
            })
            .then(done, done);
    });

    it("can save a new Customer entity", function (done) {

        // Create and initialize entity to save
        var em = newEm();
        var customer = em.createEntity('Customer', {
            CustomerID: newGuidComb(),
            CompanyName: 'Test1 ' + new Date().toISOString()
        });

        em.saveChanges()
            .then(function (saveResults) {
                expect(saveResults.entities).to.have.length(1,
                    ' should have saved new Customer with CustomerID ' +
                    customer.getProperty('CustomerID'));
            })
            .then(done, done);
    });

    it("can save a new Customer entity", function (done) {

        // Create and initialize entity to save
        var customer = em.createEntity('Customer', {
            CustomerID: newGuidComb(),
            CompanyName: "Test1 " + timestamp
        });

        entitySaveTester(done, customer, /*shouldSave*/ true);
    });

    it("can modify my own Customer entity", function (done) {

        var customer = em.createEntity('Customer', {
            CustomerID: newGuidComb(),
            CompanyName: "Test2A " + timestamp
        });

        em.saveChanges()
          .then(modifyCustomer)
          .catch(handleSaveFailed)
          .then(confirmCustomerSaved)
          .then(done, done);

        function modifyCustomer(saveResults) {
            var saved = saveResults.entities[0];
            expect(saved === customer).to.equal(true,
                "save of added customer should have succeeded");
            customer.CompanyName = "Test2M " + timestamp;
            return em.saveChanges();
        }

        function confirmCustomerSaved(saveResults) {
            var saved = saveResults.entities[0];
            expect(saved === customer).to.equal(true,
                "save of modified customer, '{0}', should have succeeded"
                .format(saved && saved.CompanyName));
        }
    });

    it("can delete my own Customer entity", function (done) {

        var customer = em.createEntity('Customer', {
            CustomerID: newGuidComb(),
            CompanyName: "Test3A " + timestamp
        });

        em.saveChanges()
          .then(deleteCustomer)
          .catch(handleSaveFailed)
          .then(confirmCustomerDeleteSaved)
          .then(done, done);

        function deleteCustomer(saveResults) {
            var saved = saveResults.entities[0];
            expect(saved === customer).to.equal(true,
                "save of added customer should have succeeded");
            customer.entityAspect.setDeleted();
            return em.saveChanges();
        }

        function confirmCustomerDeleteSaved(saveResults) {
            var saved = saveResults.entities[0];
            expect(saved === customer).to.equal(true,
                "save of deleted customer, '{0}', should have succeeded"
                .format(saved && saved.CompanyName));

            var state = customer.entityAspect.entityState.name;
            expect(state).to.equal(breeze.EntityState.Detached.name,
                "customer object should be 'Detached'");
        }
    });

    it("can save new Order and its OrderDetails in one transaction", function (done) {

        var order = em.createEntity('Order', { ShipName: 'Add OrderGraphTest' });

        em.createEntity('OrderDetail', { Order: order, ProductID: 1, UnitPrice: 42.42 });
        em.createEntity('OrderDetail', { Order: order, ProductID: 2, UnitPrice: 42.42 });
        em.createEntity('OrderDetail', { Order: order, ProductID: 3, UnitPrice: 42.42 });

        em.saveChanges()
          .catch(handleSaveFailed)
          .then(requery).then(done, done);

        function requery() {
            // get the permanent key from the updated Order entity
            var orderID = order.OrderID;

            em.clear(); // clear the cache because we want to be sure

            return EntityQuery.from('Orders')
            .where('OrderID', 'eq', orderID)
            .expand('OrderDetails')
            .using(em).execute()
            .then(confirmOrderGraph);
        }

        function confirmOrderGraph(data) {
            var order = data.results[0];
            expect(order.ShipName).to.equal('Add OrderGraphTest',
            	"'ShipName' of the re-queried order is expected value");

            var details = (order && order.OrderDetails) || [];
            expect(details).to.have.length(3,
            	'requery of saved new Order graph came with the expected 3 details');

            var gotExpectedDetails = details.every(function (d) {
                return d.UnitPrice === 42.42;
            });
            expect(gotExpectedDetails).to.equal(true,
            	'every OrderDetail has the expected UnitPrice of 42.42');
        }
    });

    ////// helpers //////
    function entitySaveTester(done, masterEntity, shouldSave) {
        var typeName = masterEntity.entityType.shortName;
        var operation = masterEntity.entityAspect.entityState.name;
        var msgPart = " save the " + operation + " " + typeName;

        var manager = masterEntity.entityAspect.entityManager;
        manager.saveChanges()
        .then(function (saveResults) {
            var prefix = shouldSave ? "should" : "should not";
            expect(shouldSave).to.equal(true,
            	prefix + " have been able to" + msgPart +
                " with key: " + JSON.stringify(masterEntity.entityAspect.getKey().values));
        })
        .catch(function (error) {
            var prefix = shouldSave ? "should not" : "should";
            expect(shouldSave).to.equal(false,
            	"server " + prefix + " have rejected " + msgPart +
                " with the error: " + error.message);
        })
        .then(done, done);
    }
});