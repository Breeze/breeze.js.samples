/* jshint -W117, -W030, -W109 */
// ReSharper disable InconsistentNaming
describe('entityExtension:', function() {
    'use strict';

    var em;
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
        breeze.Q.all(
            moduleMetadataStore.fetchMetadata(northwindService),
            moduleMetadataStore.fetchMetadata(todoService))
        .then(function(){ done(); }, done);
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
    it("can define unmapped 'foo' property directly on EntityType", function () {
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
    * initializer called by importEntities
    *********************************************************/
    it("initializer called by importEntities"); /*, function () {
        // ARRANGE
        // Start with clean metadataStore copy; no registrations
        var store = cloneModuleMetadataStore();

        // define and register employee initializer
        store.registerEntityTypeCtor("Employee", null, employeeFooInitializer);

        // define manager using prepared test store
        var em1 = new breeze.EntityManager({
            serviceName: northwindService,
            metadataStore: store
        });

        var emp = createEmployee42();
        em1.attachEntity(emp);
        var exportData = em1.exportEntities();

        // Create em2 with with registration only
        // expecting metadata from import to fill in the entityType gaps
        // Emulate launching a disconnected app
        // and loading data from local browser storage 

        var em2 = new breeze.EntityManager(northwindService);
        em2.metadataStore.registerEntityTypeCtor("Employee", null, employeeFooInitializer);

        // Create em2 with copy constructor
        // In this path, em2 all entityType metadata + registration
        // Not realistic.

        //var em2 = em1.createEmptyCopy(); // has ALL metadata

        // ACTION
        em2.importEntities(exportData);

        // ASSERT
        var emp2 = em2.findEntityByKey(emp.entityAspect.getKey());

        ok(emp2 !== null, "should find imported 'emp' in em2");
        ok(emp2 && emp2.foo,
            "emp from em2 should have 'foo' property from initializer");
        equal(emp2 && emp2.foo, "Foo Test",
           "emp from em2 should have expected foo value");
        ok(emp2 && emp2.fooComputed,
          "emp from em2 should have 'fooComputed' observable from initializer");
        equal(emp2 && emp2.fooComputed && emp2.fooComputed(), "Foo Test",
           "emp from em2 should have expected fooComputed value");

        function createEmployee42() {
            var employeeType = store.getEntityType("Employee");
            var employee = employeeType.createEntity();
            employee.EmployeeID(42);
            employee.LastName("Test");
            return employee;
        }
    });

    function employeeFooInitializer (employee) {
        employee.foo = "Foo " + employee.LastName();
        employee.fooComputed = ko.computed(function () {
            return "Foo " + employee.LastName();
        }, this);
    };
*/

    /*********************************************************
    * unmapped property (and only unmapped property) preserved after export/import
    *********************************************************/
    it("unmapped property preserved after export/import"); /*,
        function () {
            var store = cloneModuleMetadataStore();

            var Customer = function () {
                this.unmappedProperty = "";
            };

            var customerInitializer = function (customer) {
                customer.initializerProperty =
                    customer.foo || "new initializerProperty";
            };

            store.registerEntityTypeCtor('Customer', Customer, customerInitializer);

            // create EntityManager with extended metadataStore
            var em1 = newEm(store);

            // create a new customer defined by that extended metadata
            var cust1 = em1.createEntity('Customer', {CustomerID: ash.newGuidComb()});

            // Set the 'properties' we added
            cust1.unmappedProperty("Hi, I'm unmapped");
            cust1.initializerProperty = "Hi, I'm the initializerProperty";
            cust1.adHocProperty = 42; // can always add another property; it's JavaScript

            var exportData = em1.exportEntities();

            var em2 = newEm(store);
            em2.importEntities(exportData);
            var cust2 = em2.getEntities()[0];

            // Only cust2.unmappedProperty should be preserved
            equal(cust2.unmappedProperty(), "Hi, I'm unmapped",
                "cust2.unmappedProperty's value should be restored after import");
            equal(cust2.initializerProperty, "new initializerProperty",
                "cust2.initializerProperty's value should NOT be restored after import; it is '{0}' "
                .format(cust2.initializerProperty));
            ok(typeof cust2.adHocProperty === "undefined",
                "cust2.adHocProperty should be undefined");

        });
/*
    /*********************************************************
    * createEntity sequence is ctor, init-vals, init-er, add
    *********************************************************/

    it("createEntity sequence is ctor, init-vals, init-er, add"); /*,
        function () {
            // ARRANGE
            var expected = {
                ctor: "constructor",
                initVals: "initialValues",
                initer: "initializer",
                attach: "added to manager"
            };
            var actual = [];
            var store = cloneModuleMetadataStore();
            store.registerEntityTypeCtor(
                'Customer',
                function () { // ctor
                    actual.push(expected.ctor);
                },
                function (c) { // initializer
                    if (c.CompanyName !== null) {
                        // CompanyName setting must have happened before this initializer
                        actual.push(expected.initVals);
                    }
                    actual.push(expected.initer);
                });
            actual = []; // reset after registration

            var em = newEm(store);
            em.entityChanged.subscribe(function (args) {
                if (args.entityAction === breeze.EntityAction.Attach) {
                    actual.push(expected.attach);
                }
            });

            // ACT
            var cust = em.createEntity('Customer', {
// ReSharper restore UnusedLocals
                CustomerID: ash.newGuidComb(),
                CompanyName: expected[1]
            });

            // ASSERT
            var exp = [];
            for (var prop in expected) { exp.push(expected[prop]);}
            deepEqual(actual, exp,
                "Call sequence should be: "+exp.join(", "));
        });
*/

    /*********************************************************
    * can define custom temporary key generator
    * must conform to the keygenerator-interface
    * http://www.breezejs.com/sites/all/apidocs/classes/~keyGenerator-interface.html
    *********************************************************/
    it("can define custom temporary key generator"); /*,
        function () {
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

            equal(tempIds.length, 2, "should have 2 tempIds");
            equal(o1.OrderID(), tempIds[0], "o1 should have temp key " + tempIds[0]);
            equal(o2.OrderID(), tempIds[1], "o2 should have temp key " + tempIds[1]);

        });
    */
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
    * If a store-generated key and the key value is the default value
    * the default value is replaced by client-side temporary key generator
    *********************************************************/

    it("store-gen keys w/ default values are re-set by key generator upon add to manager"); /*, 
    function () {
        var em = newEm();

            var o1 = em.createEntity('Order');
            var o1Id = o1.OrderID();
            ok(o1Id !== 0,
                "o1's default key should be replaced w/ new temp key; it is " + o1Id);

            var orderEntityType = em.metadataStore.getEntityType("Order");
            var o2 = orderEntityType.createEntity();
            o2.OrderID(42); // set to other than default value (0 for ints)
            em.addEntity(o2); // now add to the manager

            equal(o2.OrderID(), 42,
                "o2's key, 42, should not be replaced w/ new temp key when added.");
        });
    */


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