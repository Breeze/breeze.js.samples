/* jshint -W117, -W030, -W109 */
// ReSharper disable InconsistentNaming
describe('entityExtension:', function() {
    'use strict';

    ash.serverIsRunningPrecondition();

    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityState = breeze.EntityState;
    var MetadataStore = breeze.MetadataStore;
    var moduleMetadataStore = new MetadataStore();
    var northwindService = ash.northwindServiceName;
    var todoService = ash.todosServiceName;

    beforeEach(function (done) {
        if (!moduleMetadataStore.isEmpty()) {
            done(); // got it already
            return;
        }
        breeze.Q.all([
            moduleMetadataStore.fetchMetadata(northwindService),
            moduleMetadataStore.fetchMetadata(todoService)
        ]).then(function(resolveds) { done(); }, done);
    });

    /*********************************************************
    * add untracked property directly to customer instance
    *********************************************************/
    it("can add untracked 'foo' property directly to customer instance", function () {

        var em = newEm();
        var cust = em.createEntity('Customer', {
            CustomerID: ash.newGuidComb()
        });

        // add a property to the instance
        cust.foo = 'foo';

        // can get the type from the entity instance
        var propInfo = cust.entityType.getProperty("foo");

        // The Breeze Customer type knows nothing about it.
        expect(propInfo).to.be.null();
    });

    /*********************************************************
    * add unmapped property via constructor
    *********************************************************/
    it("can add unmapped boolean 'foo' property via constructor", function () {
        var store = cloneModuleMetadataStore();

        var Customer = function () {
            // These are simple 'field' properties.
            // Breeze converts them to the right kind of properties
            // for the prevailing modelLibrary adapter
            // such as KO observable properties.
            this.CustomerID = ash.newGuidComb();
            this.foo = true;
        };

        store.registerEntityTypeCtor('Customer', Customer);

        var em = newEm(store);
        var cust = em.createEntity('Customer');

        assertExpectedCustomerCtorProperties(cust);
    });

    function assertExpectedCustomerCtorProperties(cust) {
        // can get the type from the entity instance
        var custType = cust.entityType;
        expect(custType).to.exist;

        var propInfo = custType.getProperty('CustomerID');
        expect(propInfo && !propInfo.isUnmapped && propInfo.isPartOfKey)
            .to.equal(true, "'CustomerID' should be a mapped, key property");

        propInfo = custType.getProperty('foo');
        expect(propInfo && propInfo.isUnmapped)
            .to.be.equal(true, "'foo' should be an unmapped property");

        var unmapped = custType.unmappedProperties;
        expect(unmapped).to.have.length(1,
            "'foo' should be the lone unmapped property");
    }

    /*********************************************************
    * can add unmapped 'foo' property via constructor
    *********************************************************/
    it("can add unmapped numeric 'foo' property via constructor", function () {
        var store = cloneModuleMetadataStore();
        assertFooPropertyDefined(store, false);

        var Customer = function () {
            this.foo = 42;
        };
        store.registerEntityTypeCtor('Customer', Customer);
        assertFooPropertyDefined(store, true);

        // can create an entity from a type ... but it's detached
        var cust = store.getEntityType('Customer').createEntity();

        expect(cust.foo).to.equal(42);
    });

    /*********************************************************
    * can define unmapped 'foo' property directly on EntityType
    * Fails until defect #2646 is cured
    *********************************************************/
    it.skip("can define unmapped 'foo' property directly on EntityType D#2646", function () {
        var store = cloneModuleMetadataStore();
        assertFooPropertyDefined(store, false);

        var customerType = store.getEntityType('Customer');
        var fooProp = new breeze.DataProperty({
            name: 'foo',
            defaultValue: 42,
            isUnmapped: true,  // !!!
        });
        customerType.addProperty(fooProp);

        assertFooPropertyDefined(store, true);

        var cust = store.getEntityType('Customer').createEntity();

        expect(cust.foo).to.equal(42,
            "'cust.foo' should return the default=42");
    });

    /*********************************************************
    * can query an unmapped property with local cache query
    *********************************************************/
    it("can query an unmapped property with local cache query", function() {
        // Add unmapped 'foo' property via its custom constructor
        var store = cloneModuleMetadataStore();
        var Customer = function() {
            this.foo = 42;
        };
        store.registerEntityTypeCtor('Customer', Customer);
        assertFooPropertyDefined(store, true);

        var manager = newEm(store);

        // Create a customer with the target foo value
        var fooValue = 60;
        var cust = manager.createEntity('Customer', {
            CustomerID: ash.newGuid(),
            foo: fooValue,
            CompanyName: 'Test'
        });

        // Create another customer with a different foo value
        manager.createEntity('Customer', {
            CustomerID: ash.newGuid(),
            foo: fooValue + 1 ,
            CompanyName: 'Test2'
        });

        // Now have 2 customers in cache; query for the one with target foo value
        var results = manager.executeQueryLocally(
            EntityQuery.from('Customers').where('foo', 'eq', fooValue));

        expect(results.length).to.equal( 1, "cache query returned exactly 1 result.");
        var queriedCust = results[0];
        expect(queriedCust.foo).to.equal(fooValue,
             "cache query returned customer '{0}' with foo==={1}"
                .format(queriedCust.CompanyName, queriedCust.foo));
    });

    /*********************************************************
    * unmapped 'foo' property is validated
    *********************************************************/
    it("unmapped 'foo' property is validated", function () {
        var store = cloneModuleMetadataStore();
        assertFooPropertyDefined(store);
        // Arrange for 'foo' to be an unmapped Customer property
        var Customer = function () {
            this.foo = "";
        };
        store.registerEntityTypeCtor('Customer', Customer);
        var fooProp = assertFooPropertyDefined(store, true);

        var maxLengthValidator = breeze.Validator.maxLength({maxLength:5});
        fooProp.validators.push(maxLengthValidator);

        // create new customer
        var manager = newEm(store);
        var cust = manager.createEntity('Customer', {CustomerID: ash.newGuidComb()});

        cust.foo = "funky";
        var errs = cust.entityAspect.getValidationErrors(fooProp);
        expect(errs).to.have.length(0,
            "should not have validation errors about 'foo'.");

        cust.foo = "funky and fresh";
        errs = cust.entityAspect.getValidationErrors(fooProp);
        expect(errs).to.have.length(1,
            "should have 1 validation error about 'foo'.");

        var errMsg = errs[0].errorMessage;
        expect(errMsg).to.match(/foo.*or less/,
            "error message, \"{0}\", should complain that 'foo' is too long."
            .format(errMsg));
    });

    /*********************************************************
    * when unmapped property changes, what happens to
    * notifications, EntityState, and originalValues
    *********************************************************/
    describe("setting an unmapped property", function(){
        var cust;

        beforeEach(function(){
            // Arrange for 'foo' to be an unmapped Customer property
            var store = cloneModuleMetadataStore();
            var CustomerCtor = function () {
                this.foo = 42;
            };
            store.registerEntityTypeCtor('Customer', CustomerCtor);

            // Fake an existing customer
            var manager = newEm(store);
            cust = manager.createEntity('Customer',
                { CustomerID: ash.newGuidComb() },
                EntityState.Unchanged);
        });

        it("raises propertyChanged", function () {

            // Listen for foo changes
            var breezeFooNotified = false;
            cust.entityAspect.propertyChanged.subscribe(function (args) {
                if (args.propertyName === "foo") { breezeFooNotified = true; }
            });


            cust.foo = 12345;
            expect(breezeFooNotified).to.equal(true,
                "Breeze should have raised its property changed for 'foo'.");
        });

        it("the EntityState remains unchanged", function () {
            cust.foo = 12345;
            var stateName = cust.entityAspect.entityState.name;
            expect(stateName).to.equal("Unchanged",
            "cust's EntityState should still be 'Unchanged'; it is " + stateName);
        });


        it("the property is listed in originalValues", function () {
            cust.foo = 12345;

            var originalValues = cust.entityAspect.originalValues;
            var keys = Object.keys(originalValues);
            var fooInOriginalValues = keys.some(function(key) {
                return key === 'foo';
            });

            expect(fooInOriginalValues).to.be.true;
        });
    });

    /*********************************************************
    * reject changes should revert an unmapped property
    *********************************************************/
    it("reject changes reverts an unmapped property", function () {

        var CustomerCtor = function () {
            this.lastTouched = new Date();
        };
        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', CustomerCtor);

        var manager = newEm(store);

        // create a fake customer
        var originalTime = new Date(2013, 0, 1);
        var cust = manager.createEntity('Customer', {
              CompanyName: "Acme",
              lastTouched: originalTime
          }, EntityState.Unchanged);


        // an hour passes ... and we rename the customer object
        cust.lastTouched = new Date(cust.lastTouched.getTime() + 60000);
        cust.CompanyName = "Beta";

        // time passes and we want to roll back all changes
        cust.entityAspect.rejectChanges();
        //manager.rejectChanges(); // would have same effect. Obviously less granular

        expect(cust.CompanyName).to.equal('Acme',
            "'CompanyName' data property should be rolled back to 'Acme'");

        expect(cust.lastTouched).to.equal(originalTime,
            "'lastTouched' unmapped property should be rolled back to 'originalTime'");
    });


    /*********************************************************
    * define a mapped data property within constructor
    * to supply a default value
    *********************************************************/
    it("can re-define a mapped data property within constructor", function () {

        var CustomerCtor = function () {
            this.CompanyName = 'Acme';
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', CustomerCtor);

        var customerType = store.getEntityType('Customer');
        var cust = customerType.createEntity();

        expect(cust.CompanyName).to.equal('Acme',
            "'CompanyName' should equal 'Acme' by default");

        // 'CompanyName' is a mapped data property
        var propInfo = customerType.getProperty('CompanyName');
        expect(propInfo && !propInfo.isUnmapped).to.equal(true,
            "'CompanyName' should be a mapped Customer property.");
    });

    /*********************************************************
    * add instance method via constructor
    *********************************************************/
    it("can add instance method via constructor", function () {

        var CustomerCtor = function () {
            this.foo = function () { return 42;};
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', CustomerCtor);

        var customerType = store.getEntityType('Customer');
        var cust = customerType.createEntity();

        expect(cust.foo()).to.equal(42,
            "'foo' should be a function returning 42");


        // 'foo' is a function; fns are NOT listed as unmapped properties
        // The Breeze customerType knows nothing about it.
        var propInfo = customerType.getProperty("foo");
        expect(propInfo).to.equal(null,
            "'foo' should be unknown to the customer type");
    });

    /*********************************************************
    * add prototype method via constructor
    *********************************************************/
    it("can add prototype method via constructor", function () {

        var Customer = function () { };

        Customer.prototype.sayHi = function () {
            return "Hi, my name is {0}!".format(this.CompanyName);
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', Customer);

        var customerType = store.getEntityType('Customer');
        var cust = customerType.createEntity({
            CompanyName: 'Acme'
        });

        var expected = "Hi, my name is Acme!";
        expect(cust.sayHi()).to.equal(expected,
            "'sayHi' function should return expected message, '{0}'."
                .format(expected));
    });

    /*********************************************************
    * can add unmapped readonly ES5 defined property via constructor
    * add breeze exports/imports just fine
    *********************************************************/
    it("can add unmapped readonly ES5 defined property via constructor", function () {
        var store = cloneModuleMetadataStore();

        var Customer = function () { };

        Object.defineProperty(Customer.prototype, 'foo', {
            get: function () { return 42; },
            enumerable: true,
            configurable: true
        });

        store.registerEntityTypeCtor('Customer', Customer);
        assertFooPropertyDefined(store, true);

        var em = newEm(store);

        var cust = em.createEntity('Customer', {
            CustomerID: ash.newGuid(),
            CompanyName: "test cust"
        });

        var propInfo = cust.entityType.getProperty('foo');
        expect(propInfo).to.not.equal(null, "'Customer.foo' is known to metadata ");

        expect(cust.foo).to.equal(42, "'cust.foo' should return 42");

        var exported = em.exportEntities([cust], false); // export w/o metadata

        // Change the exported the foo property value. It shouldn't matter
        exported = exported.replace(/("foo":42)/, '"foo":100');

        expect(exported).to.match(/("foo":100)/,
            "replaced 42 with 100 in exported: exported is:\n" + exported);

        var cust2 = em.importEntities(exported).entities[0];

        // value still 42 because imported with "MergeStrategy.PreserveChanges" and
        // the cached cust is in the 'Added' state
        expect(cust2.foo).to.equal(42, "imported 'cust2.foo' should return 42 after import");
    });

    /*********************************************************
    * can add ES5 definedProperty to ctor that is invisible to Breeze
    * by adding to prototype AFTER registering cto.
    * Breeze would not see it and would not export or import it
    * This example wraps a Date property in an "AsString" property
    * so that the wrapped data property is read/write as a string, not a date object.
    *********************************************************/
    it("can add hidden ES5 defined wrapper property (Date) via constructor",  function () {

        var store = cloneModuleMetadataStore();

        var OrderCtor = function () { };

        // register the ctor FIRST, then add the property
        store.registerEntityTypeCtor('Order', OrderCtor);

        addDateWrapperProperty(OrderCtor, 'OrderDate', 'orderDateAsString');

        var em = newEm(store);
        var testDate = new Date(2014,0,1,13,30); // 1/1/2014 1:30 pm

        var order = em.createEntity('Order', {
            CompanyName: "test cust",
            OrderDate: testDate
        });

        // confirm can read the date through the wrapper property
        expect(order.OrderDate.value).to.equal(testDate.value,
            "'order.OrderDate' should return " + testDate);
        expect(order.orderDateAsString).to.equal(testDate.toString(),
            "'order.orderDateAsString' should return " + testDate.toString());

        var testDate2 = new Date();

        // update OrderDate by way of the wrapper property
        order.orderDateAsString = testDate2.toString();

        // confirm the update worked
        expect(order.OrderDate.value).to.equal(testDate2.value,
            "after update, 'order.OrderDate' should return " + testDate2);
        expect(order.orderDateAsString).to.equal(testDate2.toString(),
            "after update, 'order.orderDateAsString' should return " + testDate2.toString());

        // confirm it is not a breeze-tracked property
        var propInfo = order.entityType.getProperty('orderDateAsString');
        expect(propInfo).to.equal(null, "'Order.orderDateAsString' is not known to metadata ");
    });

    function addDateWrapperProperty(ctor, propName, wrapperPropName) {

        Object.defineProperty(ctor.prototype, wrapperPropName, {
            get: function () { return this[propName].toString(); },
            set: function (value) { this[propName] = value; },
            enumerable: true,
            configurable: true
        });
    }

    /*********************************************************
    * add untracked property in post-construction initializer
    *********************************************************/
    it("can add untracked property in post-construction initializer", function () {

        var customerInitializer = function (customer) {
            customer.foo = 'Foo';
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', null, customerInitializer);

        var customerType = store.getEntityType('Customer');
        var cust = customerType.createEntity();

        expect(cust.foo).to.equal('Foo',
            "'foo' property, created in initializer, should return 'Foo'");

        // The Breeze customerType knows nothing about it.
        var propInfo = customerType.getProperty('foo');
        expect(propInfo).to.equal(null,
            "'foo' property should be unknown to the customer type");
    });

    /*********************************************************
    * initializer is called by importEntities
    *********************************************************/
    it("initializer is called by importEntities", function () {

        // define and register employee initializer
        var employeeInitializer = function initializer (employee) {
            employee.foo = 'Foo ' + employee.LastName;
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Employee', null, employeeInitializer);

        // define manager using prepared test store
        var em1 = new EntityManager({
            serviceName: northwindService,
            metadataStore: store
        });

        var emp = em1.createEntity('Employee', {
            EmployeeID: 42,
            LastName: 'Test'
        });

        // export cached entities with their metadata
        var exportData = em1.exportEntities();

        // Emulate launching a separate disconnected app
        // and loading data from local browser storage  (exportData)

        // Create em2 with with registration only
        // expecting metadata from import to fill in the entityType gaps
        var em2 = new breeze.EntityManager(northwindService);

        // Must add initializer as it is not part of metadata export.
        em2.metadataStore.registerEntityTypeCtor('Employee', null, employeeInitializer);

        // Import as if from browser storage
        em2.importEntities(exportData);

        // Get from cache by key (either of two ways)
        //var emp2 = em2.getEntityByKey(emp.entityAspect.getKey());
        var emp2 = em2.getEntityByKey('Employee', 42);

        expect(emp2).to.not.equal(null,
            "should find imported emp2 with id==42");

        expect(emp2).has.property('foo').that.equal('Foo Test',
            "'emp2.foo' untracked initializer property should be 'Foo Test'");
    });

    /*********************************************************
    * unmapped property is preserved after export/import
    *********************************************************/
    it("unmapped property is preserved after export/import", function () {

        var Customer = function () {
            this.unmappedProperty = "";
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', Customer);

        // create EntityManager with extended metadataStore
        var em1 = newEm(store);

        // create a new customer defined by that extended metadata
        var cust1 = em1.createEntity('Customer', {CustomerID: ash.newGuidComb()});

        // Set the property we added
        cust1.unmappedProperty = 'Hi, I\'m unmapped';

        // export and import into new manager (em2)
        var exportData = em1.exportEntities();
        var em2 = newEm(store);
        var cust2 = em2.importEntities(exportData).entities[0];

        expect(cust2.unmappedProperty).to.equal('Hi, I\'m unmapped',
            "cust2.unmappedProperty value should be restored after import");
    });

    /*********************************************************
    * initializer property is NOT preserved after export/import
    *********************************************************/
    it("initializer property is NOT preserved after export/import", function () {

        var customerInitializer = function (customer) {
            customer.initializerProperty = '';
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', null, customerInitializer);

        // create EntityManager with extended metadataStore
        var em1 = newEm(store);

        // create a new customer defined by that extended metadata
        var cust1 = em1.createEntity('Customer', {CustomerID: ash.newGuidComb()});

        // Set the property we added
        cust1.initializerProperty = 'Hi, I\'m the initializerProperty';

        // export and import into new manager (em2)
        var exportData = em1.exportEntities();
        var em2 = newEm(store);
        var cust2 = em2.importEntities(exportData).entities[0];

        expect(cust2.initializerProperty).to.equal('',
            "cust2.initializerProperty's value should NOT be restored after import.");

        expect(cust1.initializerProperty).to.equal('Hi, I\'m the initializerProperty',
            "cust1.initializerProperty's value is still set.");
    });

    /*********************************************************
    * createEntity sequence is ctor, init-vals, init-fn, add
    *********************************************************/
    it("createEntity sequence is ctor, init-vals, init-fn, add", function () {
        // ARRANGE
        var actual;
        var action = {
            ctor: "constructor",
            initVals: "initialValues",
            initFn: "initializer",
            attach: "added to manager"
        };

        var ctor = function ctor () {
            actual && actual.push(action.ctor);
        };

        var initFn = function (c) {
            if (c.CompanyName !== null) {
                // CompanyName setting must have happened so record
                // that initial values were used before initFn was called
                actual.push(action.initVals);
            }
            actual.push(action.initFn);
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', ctor, initFn);
        var em = newEm(store);

        // Listen for entity cache 'Attach' event
        em.entityChanged.subscribe(function (args) {
            if (args.entityAction === breeze.EntityAction.Attach) {
                actual.push(action.attach);
            }
        });

        actual = [];

        // ACT
        var cust = em.createEntity('Customer', {
            CustomerID: ash.newGuidComb(),
            CompanyName: 'Acme'
        });

        // ASSERT
        expect(actual[0]).to.equal(action.ctor,    'ctor called 1st');
        expect(actual[1]).to.equal(action.initVals,'initial values 2nd');
        expect(actual[2]).to.equal(action.initFn,  'initializer 3rd');
        expect(actual[3]).to.equal(action.attach,  'attach-to-mgr 4th');
    });

    /*********************************************************
    * can define custom temporary key generator
    * must conform to the keygenerator-interface
    * http://www.breezejs.com/sites/all/apidocs/classes/~keyGenerator-interface.html
    *********************************************************/
    it("can define custom temporary key generator", function () {
        var em = newEm();

        // add statics for testing the key generator
        var tempIds = TestKeyGenerator.tempIds = [];

        em.setProperties({ keyGeneratorCtor: TestKeyGenerator });

        // Order has an integer key.
        // temporary keys are assigned when added to an EntityManager
        var o1 = em.createEntity('Order');
        var o2 = em.createEntity('Order');

        // Customer has a client-assigned Guid key
        // A new Customer does not add its key to the tempIds
        em.createEntity('Customer',{CustomerID: ash.newGuidComb()});

        expect(tempIds).to.have.length(2, "should have 2 tempIds");
        expect(o1.OrderID).to.equal(tempIds[0], "o1 should have temp key " + tempIds[0]);
        expect(o2.OrderID).to.equal(tempIds[1], "o2 should have temp key " + tempIds[1]);
    });

    function TestKeyGenerator() {
        var self = this;
        this.nextNumber = -1000;

        this.generateTempKeyValue = function (entityType) {
            var keyProps = entityType.keyProperties;
            if (keyProps.length > 1) {
                throw new Error("Cannot autogenerate multi-part keys");
            }
            var keyProp = keyProps[0];
            var nextId = getNextId(keyProp.dataType);
            TestKeyGenerator.tempIds.push(nextId);
            return nextId;
        };

        function getNextId(dataType) {
            if (dataType.isNumeric) {
                return self.nextNumber -= 1;
            }

            if (dataType === breeze.DataType.Guid) {
                return breeze.core.getUuid();
            }

            throw new Error("Cannot generate key for a property of datatype: " +
                dataType.toString());
        }
    }

    /*********************************************************
    * If key is store-generated and the given key value is the default value
    * the default value is replaced by client-side temporary key generator
    *********************************************************/
    it("store-gen keys w/ default values are re-set by key generator upon add to manager",
        function () {
            var em = newEm();

            // implicit default key value
            var o1 = em.createEntity('Order');
            expect(o1.OrderID).to.be.below(0,
                "o1's default key should be replaced by negative temp key; it is " + o1.OrderID);

            // explicit default key value
            var o2 = em.createEntity('Order', { OrderID: 0 });
            expect(o2.OrderID).to.be.below(0,
                "o2's explict '0' key should be replaced by negative temp key; it is " + o2.OrderID);

            // a non-default key value
            var o3 = em.createEntity('Order', { OrderID: 42 });
            expect(o3.OrderID).to.equal(42,
                "o3's non-zero key is retained; it is " + o3.OrderID);
        });

    /*********************************************************
    * helpers
    *********************************************************/

    function assertFooPropertyDefined(metadataStore, shouldBe) {
        var custType = metadataStore.getEntityType('Customer');
        var fooProp = custType.getDataProperty('foo');
        if (shouldBe) {
            expect(fooProp && fooProp.isUnmapped).to.equal(true,
                "'foo' property should be defined as unmapped property after registration.");
        } else {
            expect(!fooProp).to.equal(true,
                "'foo' property should NOT be defined before registration.");
        }
        return fooProp;
    }

    function cloneModuleMetadataStore() {
        return cloneStore(moduleMetadataStore);
    }

    function cloneStore(source) {
        var metaExport = source.exportMetadata();
        return new MetadataStore().importMetadata(metaExport);
    }

    function newEm(metadataStore) {
        return new EntityManager({
            serviceName: northwindService,
            metadataStore: metadataStore || moduleMetadataStore
        });
    }
});