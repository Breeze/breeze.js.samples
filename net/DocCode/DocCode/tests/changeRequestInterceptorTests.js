/**************************************************************
 * Demonstrate the data source adapter "changeRequestInterceptor'
 * New as of v.1.4.14
 * These tests don't need a real server - we don't care what the server does
 * - so they fake the AJAX call which always responds with an error
 * that contains the request data, exactly as it would have been.
 *************************************************************/

(function (testFns, metadata) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup
    *********************************************************/
    var origOData = window.OData;
    // 'Web API' adapter by default; a test can change it
    var dsAdapter = breeze.config.getAdapterInstance("dataservice", 'webApi');
    var ajaxAdapter = breeze.config.getAdapterInstance("ajax");
    if (!ajaxAdapter) { throw new Error("No existing ajax adapter to fake."); }
    var fakeAjaxErr = 'All requests are "errors" in changeRequestInterceptor tests';

    /************************** UNIT TESTS *************************/

    module("changeRequestInterceptor unit tests", {
        setup: function () { ajaxAdapter.ajax = fakeAjaxFn; },
        teardown: function() {
            delete ajaxAdapter.ajax; // restore the prototype's fn
            delete dsAdapter.changeRequestInterceptor; // ditto
            window.OData = origOData;
        }
    });

    asyncTest("Doing nothing with the changeRequestInterceptor is fine", function () {
        expect(2);
        var stuff = prepareCachedData();
        var origNote = stuff.employee.getProperty('Notes');
        stuff.employee.setProperty('Notes', 'An alternative note.');
        stuff.em.saveChanges().then(successGuard).catch(inspect).fin(start);

        function inspect(error) {
            var data = getSaveData(error);
            equal(data.entities.length, 1, "should prepare one entity for save.");
            var empData = data.entities[0];
            equal(empData.entityAspect.originalValuesMap.Notes, origNote, "should send original note in orig values");
        }
    });
    asyncTest("Web API adapter's changeRequestInterceptor methods are called", function () {
        expect(6);
        var stuff = prepareCachedData();

        dsAdapter.changeRequestInterceptor = function (saveContext, saveBundle) {
            ok(saveContext != null, '"saveContext" is available to the interceptor constructor');
            ok(saveBundle != null, '"saveBundle" is available to the interceptor constructor');

            this.getRequest = function (request, entity, index) {
                ok(request != null, 'entity request is available to the interceptor getRequest method');
                ok(entity === stuff.employee, 'the entity passed to the interceptor getRequest method is the changed employee');
                equal(index, 0, "the index of the entity in the change-set is passed to the interceptor getRequest method");
                return request;
            };
            this.done = function( requests) {
                ok(Array.isArray(requests), 'requests array is passed to the interceptor done method ');
            };
        };
        stuff.employee.setProperty('Notes', 'An alternative note.');
        stuff.em.saveChanges().then(successGuard).fin(start);
    });

    asyncTest("Web API adapter's changeRequestInterceptor.getRequest can clear original value", function () {
        expect(1);
        dsAdapter.changeRequestInterceptor = function (/*saveContext, saveBundle*/) {
            this.getRequest = function (request/*, entity, index*/) {
                var map = request.entityAspect.originalValuesMap;
                if (map && map.Notes) {
                    // Null the original value but KEEP the property name.
                    // The existence of this property name tells the server you want to update it
                    // with the current value in the request body.
                    map.Notes = null;
                }
                return request;
            };
            this.done = function (/*requests*/) {};
        }

        var stuff = prepareCachedData();
        stuff.employee.setProperty('Notes', 'An alternative note.');
        stuff.em.saveChanges().then(successGuard).catch(inspect).fin(start);

        function inspect(error) {
            var data = getSaveData(error);
            var empData = data.entities[0];
            equal(empData.entityAspect.originalValuesMap.Notes, null, "should send null for 'Notes' in orig values");
        }
    });

    asyncTest("Web API adapter's changeRequestInterceptor.done can clear original values", function () {
        expect(4);
        dsAdapter.changeRequestInterceptor = function (/*saveContext, saveBundle*/) {
            this.getRequest = function (request/*, entity, index*/) { return request;};
            this.done = function( requests) {
                requests.forEach(function (request) {
                    var map = request.entityAspect.originalValuesMap;
                    for (var key in map) {
                        if (key === "RowVersion") continue; // keep the concurrency property's original value
                        map[key] = null;
                    }
                });
            };
        }

        var stuff = prepareCachedData();
        // three changes means three original values (plus the concurrency property, RowVersion)
        stuff.employee.setProperty('Notes', 'An alternative note.');
        stuff.employee.setProperty('LastName', 'Gonzo');
        stuff.customer.setProperty('CompanyName', 'Fifi');
        stuff.em.saveChanges().then(successGuard).catch(inspect).fin(start);

        function inspect(error) {
            var data = getSaveData(error);
            data.entities.forEach(function(e) {
                var map = e.entityAspect.originalValuesMap;
                var tName = e.entityAspect.entityTypeName;
                for (var p in map) {
                    if (p === 'RowVersion') {
                        ok(map[p] !== null, tName + '.' + p + ' original value should be defined; is ' + map[p]);
                    } else {
                        ok(map[p] === null, tName + '.' + p + ' original value should be null');
                    }
                }
            });
        }
    });

    asyncTest("Web API adapter's changeRequestInterceptor.getRequest can discard a changed property", function () {
        expect(5);
        dsAdapter.changeRequestInterceptor = function (/*saveContext, saveBundle*/) {
            this.getRequest = function (request/*, entity, index*/) {
                var map = request.entityAspect.originalValuesMap;
                if (request.__unmapped.Foo) {
                    delete request.__unmapped.Foo; // don't send this unmapped property
                }
                if (map.Foo) {
                    // Delete the original value property name too
                    delete map.Foo;
                }
                return request;
            };
            this.done = function (/*requests*/) { };
        }

        var stuff = prepareCachedData();
        var newFoo = 'bar, bar, bar, bar bar ba-ran.';
        // update these unmapped properties
        stuff.employee.setProperty('Foo', newFoo);
        stuff.employee.setProperty('Zig', 'Zag');
        // updating a mapped property triggers EntityState change (so will save)
        stuff.employee.setProperty('LastName', 'Hiss');
        stuff.em.saveChanges().then(successGuard).catch(inspect).fin(start);

        function inspect(error) {
            var data = getSaveData(error);
            var empData = data.entities[0];
            ok(empData.__unmapped.Foo === undefined,
                "'Foo' should NOT be in unmapped values sent to server after stripping from request");

            var map = empData.entityAspect.originalValuesMap;
            ok(map.Foo === undefined, "'Foo' should NOT be in orig values");
            equal(stuff.employee.getProperty('Foo'), newFoo,
                "changed 'Foo' value is still on the client entity.");

            ok(empData.__unmapped.Zig !== undefined,
                "'Zig' should remain in unmapped values sent to server because not removed");
            ok(map.Zig !== undefined, "'Zig' should remain in orig values");
        }
    });

    asyncTest("OData adapter's changeRequestInterceptor.getRequest can add request header", function () {
        expect(2);
        useFakeOData();
        var funHeader = "ha ha ha";
        dsAdapter.changeRequestInterceptor = function (/*saveContext, saveBundle*/) {
            this.getRequest = function (request/*, entity, index*/) {
                request.headers['X-FUN-HEADER'] = funHeader;
                return request;
            };
            this.done = function (/*requests*/) { };
        }

        var stuff = prepareCachedData();
        stuff.employee.setProperty('Notes', 'An alternative note.');
        stuff.customer.setProperty('CompanyName', 'Fifi');
        stuff.em.saveChanges().then(successGuard).catch(inspect).fin(start);

        function inspect(error) {
            var requests = error.body.__batchRequests[0].__changeRequests;
            requests.forEach(function (r) {
                equal(r.headers['X-FUN-HEADER'], funHeader,
                ' fun header found for requestUri=' + r.requestUri);
            });
        }
    });
    asyncTest("OData adapter's changeRequestInterceptor.done can tweak requestUr", function() {
        expect(2);
        useFakeOData();
        var uriPrefix = "test/";
        dsAdapter.changeRequestInterceptor = function( /*saveContext, saveBundle*/) {
            this.getRequest = function(request /*, entity, index*/) { return request; };
            this.done = function(requests) {
                requests.forEach(function(r) {
                    r.requestUri = uriPrefix + r.requestUri;
                });
            };
        }

        var stuff = prepareCachedData();
        stuff.employee.setProperty('Notes', 'An alternative note.');
        stuff.customer.setProperty('CompanyName', 'Fifi');
        stuff.em.saveChanges().then(successGuard).catch(inspect).fin(start);

        function inspect(error) {
            var requests = error.body.__batchRequests[0].__changeRequests;
            requests.forEach(function(r) {
                ok(r.requestUri.indexOf(uriPrefix) === 0,
                ' requestUri begins with "' + uriPrefix + '": ' + r.requestUri);
            });
        }
    });
/************************** TEST HELPERS *************************/

    // errors out immediately.
    // Use getSaveData(error) to see what the interceptor did
    function fakeAjaxFn(config) {
        var httpResponse = {
            config: config,
            data: fakeAjaxErr,
            getHeaders: function () { return null; },
            status: '400'
        };
        config.error(httpResponse);
    }

    function getSaveData(error) {
        if (!error.message === fakeAjaxErr) {
            ok(false, "Unexpected saveChanges error: " + error.message);
            return {};
        } else {
            return JSON.parse(error.httpResponse.config.data);
        }
    }

    function newEm() {

        var testDataService = new breeze.DataService({
            serviceName: testFns.northwindServiceName,
            adapterName: dsAdapter.name,
            hasServerMetadata: false
        });

        var em = new breeze.EntityManager({ dataService: testDataService });
        var store = em.metadataStore;
        store.importMetadata(metadata);
        store.registerEntityTypeCtor('Employee', function() {
            this.Foo = "Foo"; // an unmapped property
            this.Zig = "Zig"; // another unmapped property
        });
        return em;
    }

    function prepareCachedData(em) {

        em = em || newEm();

        var cust = em.createEntity('Customer', {
            CustomerID: testFns.wellKnownData.alfredsID,
            CompanyName: 'Alfreds Futter..blah blah',
            RowVersion: 1
        }, breeze.EntityState.Unchanged); // unchanged

        // for OData tests
        cust.entityAspect.extraMetadata = {
            etag: "EenyMeanyMinyMoe",
            uriKey: 'ima.customer/' + testFns.wellKnownData.alfredsID
        };

        var emp = em.createEntity('Employee', {
            EmployeeID: 1,
            FirstName: 'Boo',
            LastName: 'Hoo',
            Notes:"Imagine a really long note here about Boo"
        }, breeze.EntityState.Unchanged); // unchanged

        // for OData tests
        emp.entityAspect.extraMetadata = {
            etag: "FeeFiFoFum",
            uriKey: 'ima.employee/' + 1
        };

        var order = em.createEntity('Order', {
            OrderID: 1,
            EmployeeID: emp.getProperty("EmployeeID"),
            CustomerID: cust.getProperty("CustomerID")
        }, breeze.EntityState.Unchanged);

        em.createEntity('OrderDetail', {
            OrderID: order.getProperty("OrderID"),
            ProductID: 1,
            Quantity: 1,
            UnitPrice: 100,
        }, breeze.EntityState.Unchanged);

        em.createEntity('OrderDetail', {
            OrderID: order.getProperty("OrderID"),
            ProductID: 2,
            Quantity: 2,
            UnitPrice: 200,
        }, breeze.EntityState.Unchanged);
        return {
            customer: cust,
            em: em,
            employee: emp,
            order: order,
        }

    }

    function successGuard() {
        ok(false, "No request should succeed; how is this possible?");
    }

    function useFakeOData() {
        window.OData = {
            jsonHandler: {},
            request: function (config, success, fail) {
                var err = {
                    response: {
                        body: config.data,
                        statusText: fakeAjaxErr,
                        statusCode: '400'
                    }
                };
                fail(err);
            }
        }
        dsAdapter = breeze.config.initializeAdapterInstance('dataService', 'odata', false);
    }

})(docCode.testFns, docCode.northwindMetadata);