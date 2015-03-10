
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
// ReSharper disable AssignedValueIsNeverUsed
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup
    *********************************************************/
    var handleFail = testFns.handleFail;
    var EntityQuery = breeze.EntityQuery;

    // When targeting the Foo controller
    var fooDataService = new breeze.DataService({
        serviceName: "api",
        hasServerMetadata: false
    });
    function newFooEm() {
        return new breeze.EntityManager({ dataService: fooDataService });
    }

    // Target the Northwind service by default
    var northwindService = testFns.northwindServiceName;
    var newNorthwindEm = testFns.newEmFactory(northwindService);

    var moduleOptions = testFns.getModuleOptions(newNorthwindEm);

    /************************** QUERIES *************************/

    module("query xtras", moduleOptions);

    //#region "no tracking" queries

    /*********************************************************
    * simple query w/ "no tracking" does not add to cache
    *********************************************************/
      asyncTest('simple query w/ "no tracking" does not add to cache', function () {
        expect(2);
        var em = newNorthwindEm();
        EntityQuery.from('Employees')
            .noTracking(true)
            .using(em).execute()
            .then(success).fail(handleFail).fin(start);

        function success(data) {
          var emps = data.results, len = emps.length;
          ok(len, 'Expected "Employees" and got ' + len);

          var cachedEmps = em.getEntities('Employee');
          len = cachedEmps.length;
          equal(0, len, 'Expected ZERO cached "Employees" and got ' + len);
        }
      });

    /*********************************************************
     * simple expand query w/ "no tracking" does not add to cache
     *********************************************************/
      asyncTest('simple expand query w/ "no tracking" does not add to cache', function () {
        expect(3);
        var em = newNorthwindEm();
        EntityQuery.from('Employees')
          .noTracking(true)
          .top(1)
          .expand('Orders')
          .using(em).execute()
          .then(success).fail(handleFail).fin(start);

        function success(data) {
          var emps = data.results, len = emps.length;
          equal(1, len, 'Expected one "Employee" and got ' + len);
          var cachedEmps = em.getEntities('Employee');
          len = cachedEmps.length;
          equal(0, len, 'Expected ZERO cached "Employees" and got ' + len);
          var cachedOrders = em.getEntities('Order');
          len = cachedOrders.length;
          equal(0, len, 'Expected ZERO cached "Orders" and got ' + len);
        }
      });

    /*********************************************************
    * object query (e.g., lookups) w/ "no tracking" does not add to cache
    * See http://stackoverflow.com/questions/28907969/breeze-js-not-honoring-the-notracking-option-when-end-point-returns-multiple-r
    *********************************************************/
      asyncTest('object query (e.g., lookups) w/ "no tracking" does not add to cache', function () {
        expect(4);
        var em = newNorthwindEm();
        EntityQuery.from('Lookups')
          .noTracking(true)
          .using(em).execute()
          .then(success).fail(handleFail).fin(start);

        function success(data) {
          var lookups = data.results[0];
          var hasLookups = lookups &&
                           lookups.categories && lookups.regions && lookups.territories;
          ok(hasLookups, 'Expected a lookups object w/ categories, regions and territories');

          var cachedCats = em.getEntities('Category');
          var len = cachedCats.length;
          equal(0, len, 'Expected ZERO cached "Regions" and got ' + len);
          var cachedRegs = em.getEntities('Region');
          len = cachedRegs.length;
          equal(0, len, 'Expected ZERO cached "Regions" and got ' + len);
          var cachedTerrs = em.getEntities('Territory');
          len = cachedTerrs.length;
          equal(0, len, 'Expected ZERO cached "Territories" and got ' + len);
        }
      });
    //#endregion

    //#region Foo queries

    /*********************************************************
    * can query an arbitrary object from a vanilla Web API controller
    *********************************************************/
    asyncTest("can query all Foos from a vanilla Web API controller", function () {
        expect(1);
        newFooEm().executeQuery("foos")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var foos = data.results, len = foos.length;
            ok(len, "Expected 'Foos' and got " + len);
        }
    });
    asyncTest("can filter Foos from a vanilla Web API controller", function () {
        expect(2);
        newFooEm().executeQuery("foos/?$filter=ID le 3")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var foos = data.results, len = foos.length;
            ok(len, "Expected 'Foos' and got " + len);
            var foosWithIdOver3 = foos.filter(function(f) { return f.ID > 3; });
            equal(foosWithIdOver3.length, 0, "Should have no 'Foo' with ID>3.");
        }
    });
    asyncTest("can get a Foo by ID from a vanilla Web API controller", function () {
        expect(2);
        newFooEm().executeQuery("foos/1")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var foos = data.results, len = foos.length;
            equal(len, 1, "Expected one 'Foo' and got " + len);
            equal(data.results[0].ID, 1, "Should have raw 'Foo' with ID eq 1.");
        }
    });

    /*********************************************************
    * can get Foos metadata from a dedicated metadata controller
    *********************************************************/
    asyncTest("can get Foos metadata from a dedicated metadata controller", function () {
        expect(1);
        var store = new breeze.MetadataStore();
        store.fetchMetadata("breeze/FoosMetadata")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var fooType = store.getEntityType('Foo');
            ok(fooType, "Got metadata; has 'Foo' entity type with data properties: "+
            fooType.dataProperties.map(function (p) { return "'" + p.name + "'"; }).join(", "));
        }
    });
    //#endregion

    /*********************************************************
    * can fetch a hash of entities (Lookups)
    *********************************************************/
    asyncTest("can fetch a hash of entities", function () {
        expect(6);
        newNorthwindEm().executeQuery("Lookups")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var bag = data.results[0], propNames = [];
            ok(bag, "expected to get an object, 'the hash'.");
            ok(bag.entityAspect == undefined,
                "the hash should not be an entity.");
            for (var prop in bag) {
                propNames.push(prop);
            };
            equal(propNames.length, 3,
                "expected hash to have 3 members and got " + propNames.join(", "));
            propNames.forEach(function (propName) {
                var ex = null;
                try {
                    bag[propName][0].entityAspect.entityState.isUnchanged();
                } catch(ex) {}
                ok(!ex, "expected '" +propName+ "' be an array containing Unchanged entities.");
            });

        }
    });

})(docCode.testFns);