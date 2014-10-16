/* jshint -W117, -W030, -W109 */
// ReSharper disable InconsistentNaming
describe("entity:", function () {
    'use strict';

    var testFns = window.docCode.testFns;

    var cust;
    var em;
    var EntityState = breeze.EntityState;
    var dummyCustID = testFns.newGuidComb();
    var dummyEmpID = 42;
    var UNCHGD = EntityState.Unchanged;

    beforeEach(module('testApp'));

    beforeEach(function () {
        em = new breeze.EntityManager(testFns.northwindServiceName);
        testFns.importNorthwindMetadata(em);
    });

    it("can add Customer with manager.CreateEntity", function () {
        cust = em.createEntity("Customer", {
            CustomerID: dummyCustID // initialize the client-generated key
        });
        expect(cust.entityAspect.entityState).to.equal(EntityState.Added);
    });

    it("can add Customer using the EntityType", function() {
        var customerType = em.metadataStore.getEntityType("Customer");
        cust = customerType.createEntity();
        cust.CustomerID = dummyCustID;
        em.addEntity(cust);

        expect(cust.entityAspect.entityState).to.equal(EntityState.Added);
    });

    describe("when create a Customer in the unchanged state as if it had been queried", function () {

        beforeEach(function () {
            cust = em.createEntity('Customer', {
                CustomerID: dummyCustID,
                CompanyName: 'Foo Co',
                ContactName: 'Ima Kiddin'
            }, UNCHGD);  // creates the entity in the Unchanged state
        });

        it('should be in the unchanged state', function () {
            expect(cust.entityAspect.entityState).to.equal(EntityState.Unchanged);
        });

        describe('when then modify it', function () {
            beforeEach(function () {
                cust.CompanyName = 'Bar Co';
                cust.Phone = '510-555-1212';
            });

            it('should be in modified state', function () {
                expect(cust.entityAspect.entityState).to.equal(EntityState.Modified);
            });
            it('should have modified CompanyName', function () {
                expect(cust.CompanyName).to.equal('Bar Co');
            });
            it('should have modified ContactName', function () {
                expect(cust.ContactName).to.equal( 'Ima Kiddin');
            });
            it('should have expected Phone', function () {
                expect(cust.Phone).to.equal('510-555-1212');
            });
        });
    });
});
