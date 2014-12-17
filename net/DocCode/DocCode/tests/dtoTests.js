/**************************************************************
 * Tests related to the "DTO" documentation
 * Explore a variety of approaches for fetching and saving data
 * that are not shaped or mapped directly to the server-side entities
 * DTOs are one ... but only one ... of the ways to cope
 *************************************************************/
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
// ReSharper disable AssignedValueIsNeverUsed
(function (testFns) {
  "use strict";

  /*********************************************************
  * Breeze configuration and module setup
  *********************************************************/
  var EntityQuery = breeze.EntityQuery;
  var handleFail = testFns.handleFail;

  // Target the Northwind service by default
  var northwindDtoService = testFns.northwindDtoServiceName;
  var newEm = testFns.newEmFactory(northwindDtoService);

  var moduleOptions = testFns.getModuleOptions(newEm);

  /************************** QUERIES *************************/

  module("dto queries", moduleOptions);

  asyncTest("can get ALL DTO customers", function () {
    expect(7);

    EntityQuery.from("Customers")
      .using(newEm()).execute()
      .then(success).catch(handleFail).finally(start);

    function success(data) {
      ok(data.results.length > 0, 'got ' + data.results.length + ' DTO customers');
      var cust1 = data.results[0];
      ok(cust1.getProperty('CustomerID')  !== undefined, 'DTO customer has a CustomerID');
      ok(cust1.getProperty('CompanyName') !== undefined, 'DTO customer has a CompanyName');

      // Properties of a DTO customer that is not in the server-side Customer
      ok(cust1.getProperty('OrderCount')  !== undefined, 'DTO customer has an OrderCount!');
      ok(cust1.getProperty('FragusIndex') !== undefined, 'DTO customer has a FragusIndex!');

      // Properties of a server-side customer that are not in the CustomerDTO
      var keys = Object.keys(cust1);
      ok(keys.indexOf('ContactName') === -1, 'DTO customer does NOT have a ContactName');
      ok(keys.indexOf('City') === -1,        'DTO customer does NOT have a City');
    }

  });

  asyncTest("can page a few DTO customers", function () {
    expect(1);

    EntityQuery.from("Customers")
      .take(3).skip(2)
      .orderBy('CompanyName') // can sort on it because same property name as in EF model
      .using(newEm()).execute()
      .then(success).catch(handleFail).finally(start);

    function success(data) {
      equal(data.results.length, 3, 'got the expected number (3) of DTO customers');
    }

  });

  asyncTest("can filter for DTO customers by CompanyName", function () {
    expect(1);

    EntityQuery.from("Customers")
    // can filter on it because same property name as in EF model
      .where('CompanyName', 'startsWith', 'C')
      .using(newEm()).execute()
      .then(success).catch(handleFail).finally(start);

    function success(data) {
      ok(data.results.length > 0, 'got some DTO customers starting w/ "C"');
    }

  });

  asyncTest("can NOT filter for DTO customers by ContactName", function () {
    expect(1);

    EntityQuery.from("Customers")
      // can't filter on it because not a property of CustomerDTO
      .where('ContactName', 'startsWith', 'C')
      .using(newEm()).execute()
      .then(success).catch(fail).finally(start);

    function fail(err) {
      ok(/must be a valid property.*ContactName/.test(err.message),
        'should complain about invalid property; failed w/ message: ' + err.message);
    }

    function success(data) {
      ok(fail,
        'should NOT be able to filter by a property that isn\'t in the DTO');
    }

  });

  asyncTest("query for Orders returns their details", function () {
    expect(6);

    EntityQuery.from("Orders").take(1)
      .using(newEm()).execute()
      .then(success).catch(handleFail).finally(start);

    function success(data) {
      equal(data.results.length, 1, 'got the DTO Order');
      var order = data.results[0];

      // Properties of a server-side order that are not in the OrderDTO
      var keys = Object.keys(order);
      ok(keys.indexOf('ShipName') === -1, 'DTO order does NOT have a ShipName');
      ok(keys.indexOf('ShipTo') === -1,   'DTO order does NOT have a ShipTo');

      var details = order.getProperty('OrderDetails');
      ok(details.length > 1, 'DTO Order has ' + details.length + ' OrderDetails');

      var detail1 = details[0];
      ok(detail1['entityAspect'] !== undefined, 'an Order.OrderDetails element is an entity');
      // OrderDTO lacks a Product navigation property
      ok(detail1['Products'] === undefined, 'DTO OrderDetail does NOT have a Products navprop');
    }

  });

  // TODO Tests:
  // asyncTest("cannot query a type that isn't in the DTO model", function () { });

  ///// Save Tests ////

  var newGuidComb = testFns.newGuidComb;
  var handleSaveFailed = testFns.handleSaveFailed;

  module("dto saves", {
    setup: function () {
      testFns.populateMetadataStore(newEm);
    },
    teardown: function () {
      testFns.teardown_northwindReset(); // restore original db state after each test
    }
  });

  asyncTest("can save a new CustomerDTO entity", function () {
    expect(3);
    // Create and initialize entity to save
    var em = newEm();
    var customer = em.createEntity('Customer', {
      CustomerID: newGuidComb(),
      CompanyName: "Test1 " + new Date().toISOString()
    });

    em.saveChanges()
      .then(confirmSaved).catch(handleSaveFailed).finally(start);

    function confirmSaved(saveResult) {
      ok(saveResult.entities.length > 0, 'expected saved entities in saveResult');
      ok(saveResult.entities[0] === customer,
        'saveResult customerDTO is same object as saved `customer` (paranoia)');
      var state = customer.entityAspect.entityState;
      ok(state.isUnchanged(),
        'added CustomerDTO should be unchanged after save; state is ' + state.name);
    }

  });

  asyncTest("can modify my own CustomerDTO", function () {
    expect(2);
    var timestamp = new Date().toISOString();
    var em = newEm();

    var customer = em.createEntity('Customer', {
      CustomerID: newGuidComb(),
      CompanyName: "Test2A " + timestamp
    });

    em.saveChanges().then(modifyCustomer).catch(handleSaveFailed).finally(start);

    function modifyCustomer(saveResults) {
      var saved = saveResults.entities[0];
      ok(saved && saved === customer,
          "save of added CustomerDTO should have succeeded");
      customer.CompanyName("Test2M " + timestamp);
      return em.saveChanges().then(confirmSaved);
    }

    function confirmSaved(saveResults) {
      var saved = saveResults.entities[0];
      ok(saved && saved === customer,
          "save of modified CustomerDTO, '{0}', should have succeeded"
          .format(saved && saved.CompanyName()));
    }

  });

  asyncTest("can delete my own CustomerDTO", function () {
    expect(3);
    var timestamp = new Date().toISOString();
    var em = newEm();

    var customer = em.createEntity('Customer', {
      CustomerID: newGuidComb(),
      CompanyName: "Test3A " + timestamp
    });

    em.saveChanges().then(deleteCustomer).catch(handleSaveFailed).finally(start);

    function deleteCustomer(saveResults) {
      var saved = saveResults.entities[0];
      ok(saved && saved === customer,
          "save of added CustomerDTO should have succeeded");
      customer.entityAspect.setDeleted();
      return em.saveChanges()
      .then(confirmCustomerSaved);
    }

    function confirmCustomerSaved(saveResults) {
      var saved = saveResults.entities[0];
      ok(saved && saved === customer,
          "save of deleted CustomerDTO, '{0}', should have succeeded"
          .format(saved && saved.CompanyName()));

      var state = customer.entityAspect.entityState.name;
      equal(state, breeze.EntityState.Detached.name,
          "CustomerDTO object should be 'Detached'");
    }
  });

  // Product has a store-generated key; make sure ProductDTO works too
  asyncTest("can save a new ProductDTO entity", function () {
    expect(4);

    // Create and initialize entity to save
    var em = newEm();
    var product = em.createEntity('Product', {
      ProductName: "Test1 " + new Date().toISOString(),
      CategoryID: 1,
      SupplierID: 2
    });

    em.saveChanges()
      .then(confirmSaved).catch(handleSaveFailed).finally(start);

    function confirmSaved(saveResult) {
      ok(saveResult.entities.length > 0, 'expected saved entities in saveResult');
      ok(saveResult.entities[0] === product,
        'saveResult productDTO is same object as saved `product` (paranoia)');
      ok(product.getProperty('ProductID') > 0, 'productID is a permanent key value');
      var state = product.entityAspect.entityState;
      ok(state.isUnchanged(),
        'added ProductDTO should be unchanged after save; state is ' + state.name);

      var keyMappings = saveResult.keyMappings;
    }
  });

  // TODO Tests:
  // asyncTest("cannot save a type that isn't in the DTO model", function () { });
  // asyncTest("cannot save an unsavable DTO type that isn't in the DTO model", function () { });

})(docCode.testFns);