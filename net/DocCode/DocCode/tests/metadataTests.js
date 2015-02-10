// ReSharper disable InconsistentNaming
(function (testFns, northwindMetadata) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup
    *********************************************************/
    var MetadataStore = breeze.MetadataStore;

    var northwindService = testFns.northwindServiceName;
    var northwindMetadataStore = new MetadataStore();

    var handleFail = testFns.handleFail;
    var verifyQuery = testFns.verifyQuery;

    // types for testing
    var customerType;

    //#region Basic metadata tests
    module("metadataTests (fetched metadata)");

    /*********************************************************
    * Can identify FK property name for child (dependent) EntityType
    * Fails in v.1.4.7
    * See SO http://stackoverflow.com/questions/20566093/breeze-create-entity-from-existing-one/20579971?noredirect=1#comment30860601_20579971
    *********************************************************/
    asyncTest("can identify FK property name for child (dependent) EntityType", function () {

        var em = new breeze.EntityManager(northwindService);

        em.metadataStore.fetchMetadata(northwindService)
            .then(metaSuccess, metaFail).fail(handleFail).fin(start);

        function metaSuccess() {
            // Now that we have metadata, query for first employee and its territories
            // The following Web API URL does work
            //http://localhost:31439/breeze/Northwind/Employees/?$top=1&$expand=EmployeeTerritories
            return breeze.EntityQuery.from('Employees')
                .expand('EmployeeTerritories').top(1)
                .using(em).execute().then(querySuccess, queryFail);
        }

        function metaFail(error) {
            ok(false, "metadata fetch failed: " + error.message);
        }

        function querySuccess(data) {
            var emp = data.results[0];
            var empTerrs = emp.EmployeeTerritories();
            equal(empTerrs.length, 3, "Should have 3 Employee Territories");

            // THIS IS WHAT I WANT TO VERIFY
            var employeeType = em.metadataStore.getEntityType('Employee');
            var navProp = employeeType.getProperty('EmployeeTerritories');

            // should be the name of the FK property on the child EmployeeTerritory type
            var fkPropName = navProp.invForeignKeyNames[0];

            equal(fkPropName, "EmpID", // Expecting EmployeeTerritory.EmpID
                "EmployeeTerritory FK for parent Employee should be 'EmpID'");
        }

        function queryFail(error) {
            // If this fails with "DirectReports is not a function"
            // know that this is a Breeze failure not EF modeling
            // because the following URL returns the correct results from Web API
            // http://localhost:31439/breeze/Northwind/Employees/?$filter=EmployeeID%20eq%202&$expand=DirectReports
            ok(false, "query failed: " + error.message);
        }
    });
    /*********************************************************
    * Can can get enum types from raw EF-generated metadata
    * Related to feature request #2271: Extract enum values from server metadata
    *************************************************************/
    asyncTest("can get enum type from raw EF-generated metadata", function() {

        var serviceName = testFns.foosMetadataServiceName;
        var store = new breeze.MetadataStore();
        store.fetchMetadata(serviceName)
            .then(metaSuccess, metaFail).fail(handleFail).fin(start);

        function metaSuccess(rawMetadata) {
            ok(true, "foos metadata fetched");
            var enumType = rawMetadata.schema && rawMetadata.schema.enumType;
            if (enumType && enumType.name ==='Color') {
                var members = enumType.member;
                ok(members.length,
                    "should have several members; members are: " + JSON.stringify(members));
            } else {
                ok(false, "metadata should have had one enumType, 'Color'.");
            }
        }

        function metaFail(error) {
            ok(false, "foos metadata fetch failed: " + error.message);
        }

    });


    module("metadataTests", { setup: northwindMetadataStoreSetup });

    // Populate the northwindMetadataStore with Northwind service metadata
    function northwindMetadataStoreSetup() {

        if (!northwindMetadataStore.isEmpty()) return; // got it already
        //loadMetadataFromServer();
        loadMetadataFromScript();

        //function loadMetadataFromServer() {
        //    stop(); // going async for metadata ...
        //    northwindMetadataStore.fetchMetadata(northwindService)
        //        .then(assertCanGetTypeFromMetadata)
        //        .fail(handleFail)
        //        .fin(start);
        //}

        function loadMetadataFromScript() {
            testFns.importCsdlMetadata(northwindMetadataStore, northwindMetadata);

            // Associate these metadata data with the Northwind service
            northwindMetadataStore.addDataService(
                new breeze.DataService({ serviceName: northwindService }));

            assertCanGetTypeFromMetadata();
        }

        function assertCanGetTypeFromMetadata() {
            customerType = northwindMetadataStore.getEntityType("Customer", true);
            if (!customerType) {
                ok(false, "can get Customer type info");
            }
        }
    }

    /*********************************************************
    * Customer has no entity level validators
    *********************************************************/
    test("Customer has no entity level validators", function () {
        expect(1);
        var validators = customerType.validators, valCount = validators.length;
        ok(!valCount, "customer type shouldn't have entity validators; count = " + valCount);
    });

    /*********************************************************
    * Can export and import a metadataStore
    *********************************************************/
    test("export and import a metadataStore", function () {
        expect(2);
        var metaExport = northwindMetadataStore.exportMetadata();
        var newStore = new MetadataStore();
        newStore.importMetadata(metaExport);

        ok(newStore.hasMetadataFor(northwindService), "newStore has metadata for Northwind");

        var custType = newStore.getEntityType("Customer", true);
        ok(custType !== null, "can get Customer type info from newStore");
    });

    /*********************************************************
    * Can export and import a metadataStore to file
    *********************************************************/
    test("export and import a metadataStore from local storage", function () {
        expect(2);
        var metaExport = northwindMetadataStore.exportMetadata();

        ok(window.localStorage, "this browser supports local storage");

        window.localStorage.setItem('metadata', metaExport);

        var metaImport = window.localStorage.getItem('metadata');

        var newStore = new MetadataStore().importMetadata(metaImport);

        ok(newStore.hasMetadataFor(northwindService), "newStore has metadata for Northwind");
    });

    /*********************************************************
    * Can add a 2nd service to a metadataStore
    *********************************************************/
    test("add a 2nd service to a metadataStore", function () {
        expect(4);
        var todosServiceName = testFns.todosServiceName;

        ok(!northwindMetadataStore.hasMetadataFor(todosServiceName),
            "module metadataStore should not have info about " + todosServiceName);

        var todoType = northwindMetadataStore.getEntityType("TodoItem", true);
        ok(todoType == null, "therefore can't get TodoItem type info");

        var testStore = clonenorthwindMetadataStore();

        stop(); // going async
        // get Todos service metadata
        testStore.fetchMetadata(todosServiceName)

        .then(function () {

            todoType = testStore.getEntityType("TodoItem", true);
            ok(todoType !== null, "have TodoItem type info after fetchMetadata");

            var custType = testStore.getEntityType("Customer", true);
            ok(custType !== null, "still have Customer type info as well");
        })

        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * Can run two queries in parallel for fresh EM w/ empty metadataStore
    * Proves that simultaneous "first time" queries that can both request metadata
    * without a race condition.
    *********************************************************/
    test("Can run two queries in parallel for fresh EM w/ empty metadataStore", function () {
        expect(1);
        var em = new breeze.EntityManager("breeze/todos");
            var query = breeze.EntityQuery.from("Todos");
            var successCount = 0;
            stop();
            var prom1 = em.executeQuery(query)
                .then(function () { return successCount++; })
                .fail(queryFailed);
            var prom2 = em.executeQuery(query)
               .then(function () { return successCount++; })
               .fail(queryFailed);

            Q.all([prom1, prom2])
                .then(function () {
                    equal(successCount, 2, "two queries should succeed");
                })
                .fail(queryFailed)
                .fin(start);

            function queryFailed(error) {
                ok(false, "query failed when successCount is " + successCount +
                    " with error message = " + error.message);
            }
        });

    /*********************************************************
    * Can add type to metadataStore
    *********************************************************/
    test("can add 'UserPartial' type to metadataStore", function () {
        expect(5);
        var metastore = clonenorthwindMetadataStore();
        var em = newNorthwindEm(metastore);

        defineUserPartialType(metastore);

        var userPartialType = metastore.getEntityType('UserPartial');
        ok(userPartialType !== null,
            "'UserPartial' type should be in metadata");

        var query = breeze.EntityQuery
            .from("GetUserById")
            .withParameters({ Id: 3 }); // id=3 has two UserRoles

        verifyQuery(em, query, "GetUserById",
            assertResultsAreEntitiesInCache);

        function assertResultsAreEntitiesInCache(data) {
            var user = data.results[0];

            if (!user.entityType) {
                ok(false, "1st result should be an 'EntityType' but is not");
                return; // must leave, else qunit infinite loop
            }

            ok (user.entityType === userPartialType,
                "1st result should be an 'UserPartial' entity type");

            var state = user.entityAspect.entityState;
            equal(state, breeze.EntityState.Unchanged,
              "the 'UserPartial' result should be in cache in an 'Unchanged' state");

            ok(user.Password === undefined, // it is NOT the same as the User type
                "result should not have a 'Password' property");
        }

    });

    function defineUserPartialType(metadataStore) {
        var namespace = metadataStore.getEntityType('User').namespace;
        var type = new breeze.EntityType({
            shortName: 'UserPartial',
            namespace: namespace
        });
        var DP = breeze.DataProperty;
        var id = new DP({
            nameOnServer: 'Id',
            dataType: breeze.DataType.Int32,
            isPartOfKey: true
        });
        type.addProperty(id);
        type.addProperty(new DP({ nameOnServer: 'FirstName' }));
        type.addProperty(new DP({ nameOnServer: 'LastName' }));
        type.addProperty(new DP({ nameOnServer: 'Email' }));
        type.addProperty(new DP({ nameOnServer: 'RoleNames' }));

        metadataStore.addEntityType(type);
        return type;
    }
    /*********************************************************
    * Can project into a client-defined, made-up type
    *********************************************************/
    test("can project into the 'EmployeePartial' client-defined, made-up type", function () {
        expect(4);
        var store = clonenorthwindMetadataStore();
        var employeePartialType = defineEmployeePartialType(store);
        var em = newNorthwindEm(store);

        var query = breeze.EntityQuery.from('Employees')
            .where('EmployeeID', 'eq', 1)
            .select('EmployeeID, FirstName, LastName, Orders')
            .toType('EmployeePartial')
            .using(em);

        stop(); // going async
        query.execute().then(success).fail(handleFail).fin(start);

        function success(data) {
            var emp = data.results[0];
            ok(emp, "should get a projected 'Employee'");
            ok(emp.entityAspect, "should project it into an entity");
            equal(emp.entityType, employeePartialType,
            "the projected type should be " + employeePartialType.name);
            var orderCount = emp.Orders().length;
            ok(orderCount,
               "the projected 'Employee' should have 'Orders', got " + orderCount);
        }

    });

    function defineEmployeePartialType(metadataStore) {
        var empType = metadataStore.getEntityType('Employee');
        // Get the navigation property from Employee to Orders
        var assoc = empType.getNavigationProperty('Orders');
        var DataType = breeze.DataType;
        var type = new breeze.EntityType({
            shortName: 'EmployeePartial',
            namespace: empType.namespace,
            dataProperties: {
                EmployeeID: { dataType: DataType.Int32, isPartOfKey: true },
                FirstName: { },
                LastName: { }
            },
            navigationProperties: {
                Orders: { entityTypeName: "Order", isScalar: false, foreignKeyNames: assoc.inverse.foreignKeyNames, associationName: assoc.associationName }
            }
        });
        metadataStore.addEntityType(type);
        return type;
    }

    //function defineEmployeePartialTypeOld(metadataStore) {
    //    var empType = metadataStore.getEntityType('Employee');

    //    var type = new breeze.EntityType({
    //        shortName: 'EmployeePartial',
    //        namespace: empType.namespace
    //    });
    //    var DP = breeze.DataProperty;
    //    var idProperty = new DP({
    //        nameOnServer: 'EmployeeID',
    //        dataType: breeze.DataType.Int32,
    //        isPartOfKey: true
    //    });
    //    type.addProperty(idProperty);
    //    type.addProperty(new DP({ nameOnServer: 'FirstName' }));
    //    type.addProperty(new DP({ nameOnServer: 'LastName' }));

    //    // Get the navigation property from Employee to Orders
    //    var assoc = empType.getNavigationProperty('Orders');

    //    type.addProperty(new breeze.NavigationProperty({
    //        nameOnServer: 'Orders'
    //        , isScalar: false  // it's a collection
    //        , entityTypeName: assoc.entityType.name
    //        , foreignKeyNames: assoc.inverse.foreignKeyNames
    //        , associationName: assoc.associationName
    //    }));

    //    metadataStore.addEntityType(type);
    //    return type;
    //}

    //#endregion

    //#region Test Helpers

    function clonenorthwindMetadataStore() {
        return cloneStore(northwindMetadataStore);
    }

    function cloneStore(source) {
        var metaExport = source.exportMetadata();
        return new MetadataStore().importMetadata(metaExport);
    }

    function newNorthwindEm(metadataStore) {
        return new breeze.EntityManager({
            serviceName: northwindService,
            metadataStore: metadataStore || northwindMetadataStore
        });
    }
    //#endregion

})(docCode.testFns, docCode.northwindMetadata);