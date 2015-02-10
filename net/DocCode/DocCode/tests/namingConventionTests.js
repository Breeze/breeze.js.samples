// ReSharper disable InconsistentNaming
(function (testFns, northwindMetadata) {
  'use strict';

  var handleFail = testFns.handleFail;
  var MetadataStore = breeze.MetadataStore;
  var northwindService = testFns.northwindServiceName;

  module('namingConvention tests');

  //#region Make MetadataStores for each NamingConvention

  // Typically would set the naming convention once for all application managers
  //     e.g. breeze.NamingConvention.camelCase.setAsDefault();
  // Not doing so in these tests in order to avoid cross-test pollution.
  // Instead we define each MetadataStore with a specific NamingConvention.

  // Using the camelCase naming convention shipped in Breeze
  // populate the MetadataStore with Northwind service metadata
  function makeCamelCaseConventionMetadataStore() {
    var metadataStore =
        new MetadataStore({ namingConvention: breeze.NamingConvention.camelCase });

    northwindMetadataStoreSetup(metadataStore);
    return metadataStore;
  }

  // Using the default "none" naming convention shipped in Breeze
  // populate the MetadataStore with Northwind service metadata
  function makeNoneConventionMetadataStore() {
    var metadataStore =
        new MetadataStore({ namingConvention: breeze.NamingConvention.none });

    northwindMetadataStoreSetup(metadataStore);
    return metadataStore;
  }

  // Using the custom "underscore" naming convention
  // Populate the MetadataStore with Northwind service metadata
  function makeUnderscoreConventionMetadataStore() {
    var metadataStore =
        new MetadataStore({ namingConvention: new UnderscoreNamingConvention() });

    northwindMetadataStoreSetup(metadataStore);
    return metadataStore;
  }

  // Using the custom "Northwind" naming convention
  // Populate the MetadataStore with Northwind service metadata
  function makeNorthwindConventionMetadataStore() {
    var metadataStore =
        new MetadataStore({ namingConvention: new NorthwindNamingConvention() });

    northwindMetadataStoreSetup(metadataStore);
    return metadataStore;
  }

  // A silly naming convention that prepends an underscore (_) to every property name.
  function UnderscoreNamingConvention() {
    return new breeze.NamingConvention({
      serverPropertyNameToClient:
        function (serverPropertyName) {
          return '_' + serverPropertyName;
        },
      clientPropertyNameToServer:
        function (clientPropertyName) {
          return clientPropertyName.substr(1);
        }
    });
  }

  // Custom Northwind convention, based on camelCase convention, that "fixes"
  // specific property name conversions that the camelCase convention can't translate.
  // e.g.  Client: 'Customer.name' <--> Server: 'Customer.CompanyName'
  function NorthwindNamingConvention() {
    var clientToServerDictionary = {
      'Customer:#Northwind.Models': {name:'CompanyName', zip: 'PostalCode'},
      'Order:#Northwind.Models':    {freightCost:'Freight'}
    };
    return new NamingConventionWithDictionary('northwind',
      breeze.NamingConvention.camelCase, clientToServerDictionary);
  }
  //#endregion

  //#region tests

  /*********************************************************
  * Entity creation tests: demonstrate server -> client property name translation
  *********************************************************/
  test('default "none" NamingConvention applies to entity creation', function () {
    expect(2);
    var metadataStore = makeNoneConventionMetadataStore();
    var customer = metadataStore.getEntityType('Customer').createEntity();

    ok(customer['CompanyName'],
        'PascalCase "Customer.CompanyName" property should be defined in "none" MetadataStore');
    ok(!customer['companyName'],
        'camelCase "Customer.companyName" property should NOT be defined in "none" MetadataStore');
  });

  test('"camelCase" NamingConvention applies to entity creation', function () {
    expect(2);
    var metadataStore = makeCamelCaseConventionMetadataStore();
    var customer = metadataStore.getEntityType('Customer').createEntity();

    ok(!customer['CompanyName'],
        'PascalCase "Customer.CompanyName" property should NOT be defined in camelCase MetadataStore');
    ok(customer['companyName'],
        'camelCase "Customer.CompanyName" property should be defined in camelCase MetadataStore');
  });

  test('custom "underscore" NamingConvention applies to entity creation', function () {
    expect(2);
    var metadataStore = makeUnderscoreConventionMetadataStore();
    var customer = metadataStore.getEntityType('Customer').createEntity();

    ok(!customer['CompanyName'],
        'PascalCase "Customer.CompanyName" property should NOT be defined in "underscore" MetadataStore');
    ok(customer['_CompanyName'],
        'underscore "Customer._CompanyName" property should be defined in "underscore" MetadataStore');
  });

  test('"northwind" NamingConvention (camelCase extended with dictionary) applies to entity creation', function () {
    expect(7);
    var metadataStore = makeNorthwindConventionMetadataStore();
    var customer = metadataStore.getEntityType('Customer').createEntity();
    var order = metadataStore.getEntityType('Order').createEntity();

    var suffix = ' be defined in "northwind" MetadataStore';

    ok(!customer['companyName'],
        'camelCase "Customer.companyName" property should NOT' + suffix);
    ok(customer['name'],
        'lookup "Customer.name" property should' + suffix);
    ok(customer['zip'],
        'lookup "Customer.zip" property should' + suffix);
    ok(customer['customerID'],
        'camelCase "Customer.customerID" property should' + suffix);

    ok(!order['freight'],
        'camelCase "Order.freight" property should NOT' + suffix);
    ok(order['freightCost'],
        'lookup "Order.freightCost" property should' + suffix);
    ok(order['orderID'],
        'camelCase "Order.orderID" property should' + suffix);
  });

  /*********************************************************
  * Query tests: demonstrate client -> server property name translation
  *********************************************************/
  asyncTest('query with default "none" NamingConvention', function () {
    expect(2);
    var em = new breeze.EntityManager({
      serviceName: northwindService,
      metadataStore: makeNoneConventionMetadataStore()
    });

    // Resource name is unaffected by convention
    var query = breeze.EntityQuery.from('Customers')
        // use PascalCase spelling for property names in where, orderby, and expand
        .where('CompanyName', 'startsWith', 'A')
        .orderBy('CompanyName')
        .expand('Orders');

    em.executeQuery(query)
      .then(function (data) {
        var customer = data.results[0];
        ok(customer && customer['CompanyName'],
          'should return customers with a PascalCase "CompanyName" property');
        ok(customer && customer.getProperty('Orders').length > 0,
          'a Customer should have a PascalCase "Orders" property with related Order entities');
      })
      .catch(handleFail).finally(start);
  });

  asyncTest('query with camelCasing NamingConvention', function () {
    expect(2);
    var em = new breeze.EntityManager({
          serviceName: northwindService,
          metadataStore: makeCamelCaseConventionMetadataStore()
        });

    // Resource name is unaffected by convention
    var query = breeze.EntityQuery.from('Customers')
        // use camelCase spelling for property names in where, orderby, and expand
        .where('companyName', 'startsWith', 'A')
        .orderBy('companyName')
        .expand('orders');

    em.executeQuery(query)
      .then(function (data) {
        var customer = data.results[0];
        ok(customer && customer['companyName'],
          'should return customers with a camelCase "companyName" property');
        ok(customer && customer.getProperty('orders').length > 0,
          'a Customer should have a camelCase "orders" property with related Order entities');
      })
      .catch(handleFail).finally(start);
  });

  asyncTest('query with custom underscore NamingConvention', function () {
    expect(2);
    var em = new breeze.EntityManager({
      serviceName: northwindService,
      metadataStore: makeUnderscoreConventionMetadataStore()
    });

    // Resource name is unaffected by convention
    var query = breeze.EntityQuery.from('Customers')
        // use underscore spelling for property names in where, orderby, and expand
        .where('_CompanyName', 'startsWith', 'A')
        .orderBy('_CompanyName')
        .expand('_Orders');

    em.executeQuery(query)
      .then(function (data) {
        var customer = data.results[0];
        ok(customer && customer['_CompanyName'],
          'should return customers with an underscore "_CompanyName" property');
        ok(customer && customer.getProperty('_Orders').length > 0,
          'a Customer should have an underscore "_Orders" property with related Order entities');
      })
      .catch(handleFail).finally(start);
  });

  asyncTest('query with "northwind" NamingConvention (camelCase extended with dictionary) ', function () {
    expect(4);
    var em = new breeze.EntityManager({
      serviceName: northwindService,
      metadataStore: makeNorthwindConventionMetadataStore()
    });

    // Resource name is unaffected by convention
    var query = breeze.EntityQuery.from('Customers')
        // use underscore spelling for property names in where, orderby, and expand
        .where('name', 'startsWith', 'A')
        .orderBy('name')
        .expand('orders');

    em.executeQuery(query)
      .then(function (data) {
        var customer = data.results[0];
        if (customer) {
          ok(customer['name'],
            'should return customers with a lookup "name" property');
          ok(customer['zip'],
            'and with a lookup "zip" property');

          var orders = customer.getProperty('orders');
          ok(orders.length > 0,
            'a Customer should have a camelCase "orders" property with related Order entities');
          ok(orders[0] && orders[0]['freightCost'],
            'an Order should have a lookup "freightCost" property');
        } else {
          ok(false, 'query did not return any Customers');
        }
      })
      .catch(handleFail).finally(start);
  });
  //#endregion

  //#region Test Helpers

  // Populate a metadataStore with Northwind service CSDL metadata
  function northwindMetadataStoreSetup(metadataStore) {
    if (!metadataStore.isEmpty()) return; // got it already
    metadataStore.importMetadata(northwindMetadata);
    metadataStore.addDataService(
      new breeze.DataService({ serviceName: northwindService })
    );
  }

  /**
  NamingConvention that extends another {{#crossLink "NamingConvention"}}{{/crossLink}}
  by attempting first to translate specific Entity property names using a dictionary.
  If a property name is not found in the dictionary,
  it falls back to the base NamingConvention (AKA "sourceNamingConvention").

  @class NamingConventionWithDictionary
  **/

  /**
  NamingConventionWithDictionary constructor
  @example
    var clientToServerDictionary = {
      'Customer:#Northwind.Models': {name: 'CompanyName', zip: 'PostalCode'},
      'Order:#Northwind.Models':    {freightCost: 'Freight'}
    };
    return new NamingConventionWithDictionary('northwind',
        breeze.NamingConvention.camelCase, clientToServerDictionary);

  @method <ctor> NamingConventionWithDictionary
  @param name {String}
  @param sourceNamingConvention {Function} {{#crossLink "NamingConvention"}}{{/crossLink}} base class
  @param clientToServerDictionary {Object} Hash of EntityType names with inner hash of client-to-server key/value pairs
  */
  function NamingConventionWithDictionary(name, sourceConvention, clientToServerDictionary) {
    breeze.core.assertParam(name, 'name').isNonEmptyString().check();
    breeze.core.assertParam(sourceConvention, 'sourceConvention').isInstanceOf(breeze.NamingConvention).check();
    breeze.core.assertParam(clientToServerDictionary, 'clientToServerDictionary').isObject().check();

    var serverToClientDictionary = makeServerToClientDictionary();

    return new breeze.NamingConvention({
      name: name,
      clientPropertyNameToServer: clientPropertyNameToServer,
      serverPropertyNameToClient: serverPropertyNameToClient
    });

    function clientPropertyNameToServer(name, propDef) {
        var props = clientToServerDictionary[propDef.parentType.name];
        var newName = props && props[name];
        return newName || sourceConvention.clientPropertyNameToServer(name, propDef);
    }

    function serverPropertyNameToClient(name, propDef) {
      var props = serverToClientDictionary[propDef.parentType.name];
      var newName = props && props[name];
      return newName || sourceConvention.serverPropertyNameToClient(name, propDef);
    }

    // makes new dictionary based on clientToServerDictionary
    // that reverses each EntityType's {clientPropName: serverPropName} KV pairs
    function makeServerToClientDictionary() {
      var dict = {};
      for (var typeName in clientToServerDictionary) {
        if (clientToServerDictionary.hasOwnProperty(typeName)) {
          var newType = {}
          var type = clientToServerDictionary[typeName];
          for (var prop in type) {
            if (type.hasOwnProperty(prop)) {
              newType[type[prop]] = prop; // reverse KV pair
            }
          }
          dict[typeName] = newType;
        }
      }
      return dict;
    }
  }

  //#endregion
})(docCode.testFns, docCode.northwindMetadata);