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
      'Order:#Northwind.Models': { freightCost: 'Freight' },
      undefined: { foo: 'Bar' }  // translation for expected anonymous type property
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
      'Order:#Northwind.Models':    {freightCost: 'Freight'},
      undefined: {foo: 'Bar'}  // translation for expected anonymous type property
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
        var typeName = propDef && propDef.parentType && propDef.parentType.name;
        var props = clientToServerDictionary[typeName || undefined];
        var newName = props && props[name];
        return newName || sourceConvention.clientPropertyNameToServer(name, propDef);
    }

    function serverPropertyNameToClient(name, propDef) {
      var typeName = propDef && propDef.parentType && propDef.parentType.name;
      var props = serverToClientDictionary[typeName || undefined];
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

  //#region Anonymous type tests
  /*********************************************************
  * Anonymous type tests: property name translation when no property definition available
  *********************************************************/
  (function () {
    var convention, nameOnClient, nameOnServer;
    var cmsg = 'nameOnClient should be "{0}" for server prop "{1}"';
    var smsg = 'nameOnServer should be "{1}" for client prop "{0}"';

    test('"none" NamingConvention works for anonymous type', function () {
      expect(2);
      convention = breeze.NamingConvention.none;

      nameOnClient = convention.serverPropertyNameToClient('foo');
      equal(nameOnClient, 'foo', cmsg.format('foo', 'foo'));

      nameOnServer = convention.clientPropertyNameToServer('foo');
      equal(nameOnServer, 'foo', smsg.format('foo', 'foo'));
    });

    test('"camelCase" NamingConvention works for anonymous type', function () {
      expect(2);
      convention = breeze.NamingConvention.camelCase;

      nameOnClient = convention.serverPropertyNameToClient('Foo');
      equal(nameOnClient, 'foo', cmsg.format('foo', 'Foo'));

      nameOnServer = convention.clientPropertyNameToServer('foo');
      equal(nameOnServer, 'Foo', smsg.format('foo', 'Foo'));
    });

    test('"underscore" NamingConvention works for anonymous type', function () {
      expect(2);
      convention = new UnderscoreNamingConvention();

      nameOnClient = convention.serverPropertyNameToClient('Foo');
      equal(nameOnClient, '_Foo', cmsg.format('_Foo', 'Foo'));

      nameOnServer = convention.clientPropertyNameToServer('_Foo');
      equal(nameOnServer, 'Foo', smsg.format('_Foo', 'Foo'));
    });

    test('"northwind" NamingConvention (camelCase extended with dictionary) works for anonymous type', function () {
      expect(4);
      convention = new NorthwindNamingConvention();

      nameOnClient = convention.serverPropertyNameToClient('Bar');
      equal(nameOnClient, 'foo', cmsg.format('foo', 'Bar'));

      nameOnServer = convention.clientPropertyNameToServer('foo');
      equal(nameOnServer, 'Bar', smsg.format('foo', 'Bar'));

      nameOnClient = convention.serverPropertyNameToClient('Zzzz');
      equal(nameOnClient, 'zzzz', cmsg.format('zzzz', 'Zzzz'));

      nameOnServer = convention.clientPropertyNameToServer('zzzz');
      equal(nameOnServer, 'Zzzz', smsg.format('zzzz', 'Zzzz'));
    });

  })();

  //#region UnderscoreCamelCaseConvention Tests
  // Described in http://www.getbreezenow.com/documentation/namingconvention

  module('namingConvention tests (UnderscoreCamelCaseConvention)');

  function UnderscoreCamelCaseConvention() {

    return new breeze.NamingConvention({
      name: 'underscoreCamelCase',
      serverPropertyNameToClient: serverPropertyNameToClient,
      clientPropertyNameToServer: clientPropertyNameToServer
    });

    function clientPropertyNameToServer(propertyName) {
      return propertyName.replace(/[A-Z]/g, upperToUnderscoreLower);
    }

    function upperToUnderscoreLower(match) {
      return '_' + match.toLowerCase();
    }

    function serverPropertyNameToClient(propertyName) {
      return propertyName.replace(/_[a-z]/g, underscoreLowerToUpper);
    }

    function underscoreLowerToUpper(match) {
      console.log(arguments);
      console.log(match);
      return match[1].toUpperCase();
    }
  }

  // Don't have a server for this so we'll just test the convention itself
  var convention = new UnderscoreCamelCaseConvention();

  test('should translate multi-part underscore/lower server name to client camelCase', function () {
    var src = 'a_can_of_worms';
    var name = convention.serverPropertyNameToClient(src);
    equal(name, 'aCanOfWorms', 'should translate server "'+src+'" to camelcase client form; was ' + name);
  });

  test('should translate multi-part client camelCase to underscore/lower server name', function () {
    var src = 'aCanOfWorms';
    var name = convention.clientPropertyNameToServer(src);
    equal(name, 'a_can_of_worms', 'should translate client "' + src + '"  to "underscore lower" server form; was ' + name);
  });

  test('should translate one-part underscore/lower server name to client camelCase', function () {
    var src = 'worms';
    var name = convention.serverPropertyNameToClient(src);
    equal(name, 'worms', 'should translate server "' + src + '" to camelcase client form; was ' + name);
  });

  test('should translate one-part client camelCase to underscore/lower server name', function () {
    var src = 'worms';
    var name = convention.clientPropertyNameToServer(src);
    equal(name, 'worms', 'should translate client "' + src + '" to "underscore lower" server form; was ' + name);
  });

  test('can make it the default NamingConvention', function () {
    expect(2);
    var orig = breeze.NamingConvention.defaultInstance;

    var cvn = new UnderscoreCamelCaseConvention().setAsDefault();
    var def = breeze.NamingConvention.defaultInstance.name;
    equal(def, cvn.name, 'new default is ' + def);

    orig.setAsDefault();
    def = breeze.NamingConvention.defaultInstance.name;
    equal(def, orig.name, 'restored default is ' +def);
  });

  // !!! Watch out for these unexpected cases !!!
  test('should translate lead "_" in server name to client PascalCase', function () {
    var src = '_worms';
    var name = convention.serverPropertyNameToClient(src);
    equal(name, 'Worms', 'should translate server "' + src + '" to PascalCase client form; was ' + name);
  });

  test('should lead with "_" if translate PascalClient client to server', function () {
    var src = 'Worms';
    var name = convention.clientPropertyNameToServer(src);
    equal(name, '_worms', 'should translate client "' + src + '" to "underscore lower" server form; was ' + name);
  });

  test('should not translate underscore/upper "First_Name" from server', function () {
    var src = 'First_Name';
    var name = convention.serverPropertyNameToClient(src);
    equal(name, 'First_Name', 'translated server: ' + src + '" to client: ' + name);
  });

  test('should be confused by underscore/upper "Can_of_Worms" from server', function () {
    var src = 'Can_of_Worms';
    var name = convention.serverPropertyNameToClient(src);
    equal(name, 'CanOf_Worms', 'translated server: ' + src + '" to client: ' + name);
  });
  //#endregion

  //#region Other UNTESTED NamingConventions mentioned in the documentation
  // Described in http://www.getbreezenow.com/documentation/namingconvention

  // ReSharper disable UnusedLocals
  function BooleanNamingConvention() {

    var BOOL = breeze.DataType.Boolean;
    var camelCase = breeze.NamingConvention.camelCase;

    return new breeze.NamingConvention({
      name: 'booleanNamingConvention',
      clientPropertyNameToServer: clientPropertyNameToServer,
      serverPropertyNameToClient: serverPropertyNameToClient
    });

    function clientPropertyNameToServer(name, propDef) {
      // guard against empty or deficient property definition
      if (propDef && propDef.isDataProperty && propDef.dataType === BOOL) {
        return name.substr(2); // strip off the "is"
      } else {
        return camelCase.clientPropertyNameToServer(name);
      }
    }

    function serverPropertyNameToClient(name, propDef) {
      if (propDef && propDef.isDataProperty && propDef.dataType === BOOL) {
        return 'is' + name;
      } else {
        return camelCase.serverPropertyNameToClient(name);
      }
    }
  }

  // Removes underscores from server property names
  // Remembers them in a private dictionary so it can restore them
  // when translating from client name to server name
  // Warning: use only with metadata loaded directly from server
  function NoUnderscoreConvention() {

    var _underscoredNames = {}; // hash of every translated server name

    return new NamingConvention({
      name: 'noUnderscore',
      clientPropertyNameToServer: clientPropertyNameToServer,
      serverPropertyNameToClient: serverPropertyNameToClient
    });

    function clientPropertyNameToServer(clientPropertyName) {
      var serverName = _underscoredNames[clientPropertyName];
      return serverName || clientPropertyName;
    }

    function serverPropertyNameToClient(serverPropertyName) {
      if (serverPropertyName.indexOf('_') > -1) {
        var clientName = serverPropertyName.replace(/_/g, ''); // remove all _
        // remember this substitution
        _underscoredNames[clientName] = serverPropertyName;
        return clientName;
      }
      return serverPropertyName;
    }
  }

  //#endregion

})(docCode.testFns, docCode.northwindMetadata);