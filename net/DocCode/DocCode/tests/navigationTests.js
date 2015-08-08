// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var handleFail = testFns.handleFail;
    var EntityQuery = breeze.EntityQuery;
    var Predicate = breeze.Predicate;
    var EntityState = breeze.EntityState;

    // We'll use this "alfred's predicate" a lot
    // e.g. to find Orders that belong to the Alfred's customer
    var alfredsPredicate =
        Predicate.create("CustomerID", "==", testFns.wellKnownData.alfredsID);

    var queryForSome = testFns.queryForSome;
    var queryForOne = testFns.queryForOne;


    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("navigationTests", testFns.getModuleOptions(newEm));

    /*********************************************************
    * get OrderDetails of Alfreds 1st order via navigation
    * Use case: 
    *   Eagerly load OrderDetails with parent Order
    *********************************************************/
    test("Customer via navigation", function () {
        expect(4);
        var alfredsOrdersQuery = new EntityQuery("Orders")
          .where(alfredsPredicate)
          .expand("Customer");

        stop();
        queryForSome(newEm, alfredsOrdersQuery, "Alfreds orders")
        .then(assertGotCustomerFromNavigation)
        .fail(handleFail)
        .fin(start);

    });
    
    function assertGotCustomerFromNavigation(data) {

        var orders = data.results;
        var lastOrder = orders[orders.length - 1];
        
        var customer = lastOrder.Customer(),
            name = "<no customer>";

        ok(customer &&  (name = customer.CompanyName()),
            "got Customer from cache named " + name);

        var ordersByNavigation = customer.Orders();
        equal(orders.length,ordersByNavigation.length,
            "get same number of orders by navigating back from parent Customer");

        equal(lastOrder.OrderDetails().length, 0,
            "an order's details are not available " +
            "presumably because there are no details in cache");
    }
    
    /*********************************************************
    * get OrderDetails of Alfreds 1st order via navigation
    * Use case: 
    *   Eagerly load OrderDetails with parent Order
    *********************************************************/
    test("OrderDetails via navigation", function () {
        expect(4);
        var alfredsFirstOrderQuery = new EntityQuery("Orders")
          .where(alfredsPredicate).take(1)
          .expand("OrderDetails");

        stop();
        queryForOne(newEm, alfredsFirstOrderQuery, "Alfreds 1st order")
        .then(assertGotOrderDetailsFromNavigation)
        .fail(handleFail)
        .fin(start);

    });
    
    function assertGotOrderDetailsFromNavigation(data) {

        var order = data.results[0];
        var details = order.OrderDetails(), detailCount = details.length;

        ok(detailCount > 0,
            "got OrderDetails from cache; count = " + detailCount);

        ok(order === details[0].Order(),
            "first OrderDetail returns the parent Order");

        ok(details[0].Product() === null,
            "a detail's parent Product is not available " +
            "presumably because there are no products in cache");
    }
 
    /*********************************************************
    * setting child's parent entity enables parent to navigate to child
    * Use case: 
    *   Creating a new Order and assigning it to an existing Customer
    *********************************************************/
    test("setting child's parent entity enables parent to navigate to child", function () {
        expect(4);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);
        
        // The newOrder has no Customer 
        ok(newOrder.Customer() === null,
            'newOrder.Customer() === null before setting newOrder.Customer');
        
        // Set order's Customer
        newOrder.Customer(existingCustomer);
        
        // The newOrder has a Customer now
        ok(newOrder.Customer() === existingCustomer,
            'newOrder.Customer() === existingCustomer after setting newOrder.Customer');
        
        // Notice that the parent Customer immediately picks up this order!      
        ok(existingCustomer.Orders().indexOf(newOrder) >= 0,
            "existing customer's orders include the newOrder after setting newOrder.Customer");
        
        equal(existingCustomer.entityAspect.entityState, EntityState.Unchanged,
            "adding to the customer's orders does not change the customer's state");
    });

    /*********************************************************
    * setting child's parent entity raises property changed
    *********************************************************/
    test("setting child's parent entity raises property changed", function () {
        expect(3);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);

        var orderPropertyChangedRaised = 0;
        var customerPropertyChangedRaised = 0;
        var customerOrdersPropertyChangedRaised = 0;
        
        newOrder.entityAspect.propertyChanged.subscribe(
            function () { orderPropertyChangedRaised += 1 ; });
        
        existingCustomer.entityAspect.propertyChanged.subscribe(
            function () { customerPropertyChangedRaised += 1; });

        existingCustomer.Orders.subscribe(
             function () { customerOrdersPropertyChangedRaised += 1; });

        newOrder.Customer(existingCustomer);

        equal(orderPropertyChangedRaised, 2,
            "setting the order's customer raised order's property changed twice, "+
            "once for FK change and once for the navigation property change");
        
        equal(customerPropertyChangedRaised, 0,
            "setting the order's customer did NOT raise customer's property changed");      

        equal(customerOrdersPropertyChangedRaised, 1,
            "setting the order's customer raised Customer.Orders array property changed once");
    });

    /*********************************************************
    * can use getProperty and setProperty to read/write navigation properties
    * Use case: 
    *   When writing a general purpose Breeze library use the Breeze 
    *   getProperty/setProperty syntax to avoid  binding framework dependencies.
    *********************************************************/
    test("can use getProperty and setProperty to read/write navigation properties", function () {
        expect(3);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);

        // The newOrder has no Customer
        ok(newOrder.getProperty("Customer") === null,
            "newOrder's customer is null before set");

        // Set order's Customer
        newOrder.setProperty("Customer", existingCustomer);

        // The newOrder has a Customer now
        ok(newOrder.getProperty("Customer") === existingCustomer,
            "newOrder's customer is the existingCustomer after set");

        // Notice that the parent Customer immediately picks up this order!
        var customers1stOrder = existingCustomer.getProperty("Orders")[0];

        ok(customers1stOrder === newOrder,
            "existing customer's 1st order === newOrder after setting newOrder.Customer");
    });
    /*********************************************************
    * Do not set a collection navigation property!
    *********************************************************/
    test("cannot set a collection navigation property", function () {
        expect(1);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        raises(
            function () { existingCustomer.Orders([]); },
             "throws exception if try to set a collection navigation property.");

    });
    /*********************************************************
    * Can add to a collection navigation property
    *********************************************************/
    test("add child entity to a parent's collection", function () {
        expect(3);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);

        // add the order to the customer's orders collection
        // note that we are NOT setting the newOrder's customer directly
        existingCustomer.Orders().push(newOrder);

        // The newOrder has a Customer now
        ok(newOrder.Customer() === existingCustomer,
            "order has the expected parent customer after pushing the order into the customer array");
        
        ok(existingCustomer.Orders().indexOf(newOrder) >= 0,
            "order is in the customer's collection after pushing the order into the customer array");

        equal(existingCustomer.entityAspect.entityState, EntityState.Unchanged,
            "adding to the customer's orders does not change the customer's state");
    });
    /*********************************************************
    * Adding to a collection navigation property raises KO notification
    *********************************************************/
    test("adding to a collection navigation property raises KO notification", function () {
        expect(2);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder1 = createOrder();
        em.addEntity(newOrder1);

        var newOrder2 = createOrder();
        em.addEntity(newOrder2);

        var breezeOrderChangedCount = 0;
        
        // listening on the special array returned by Breeze nav property
        existingCustomer.Orders().arrayChanged.subscribe(
        function () {
             breezeOrderChangedCount += 1;
        });
        
        var koOrdersChangedCount = 0;     
        existingCustomer.Orders.subscribe(
            function (newValue) {
                 koOrdersChangedCount += 1;
            });
        
        // two ways to push
        existingCustomer.Orders().push(newOrder1);
        existingCustomer.Orders.push(newOrder2);

        equal(koOrdersChangedCount, 2,
            "should have one ko 'Orders' changed notification");
        
        equal(breezeOrderChangedCount, 2,
            "should have two Breeze 'Orders' changed notifications");
    });
    /*********************************************************
    * detaching a child entity empties its navigations
    *********************************************************/
    test("detaching an entity empties its navigations", function () {
        expect(3);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);
        newOrder.Customer(existingCustomer);
 
        ok(existingCustomer.Orders().indexOf(newOrder) !== -1,
            "newOrder is among the customer's orders before detaching the order");
        
        em.detachEntity(newOrder); // remove newOrder from cache

        ok(newOrder.Customer() === null,
            "customer of detached order is no longer accessible");

        ok(existingCustomer.Orders().indexOf(newOrder) === -1,
            "detached newOrder is no longer among the customer's orders");

    });
    /*********************************************************
   * detaching a parent entity empties its navigations
   *********************************************************/
    test("detaching an entity empties its navigations", function () {
        expect(3);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);
        newOrder.Customer(existingCustomer);

        ok(existingCustomer.Orders().indexOf(newOrder) !== -1,
            "newOrder is among the customer's orders before detaching the customer");

        em.detachEntity(existingCustomer); // remove customer from cache

        ok(newOrder.Customer() === null,
            "order's detached customer is no longer accessible");

        ok(existingCustomer.Orders().length === 0,
            "detached customer no longer has orders");

    });
    /*********************************************************
    * changing child's parent entity removes it from old parent
    * Use case: 
    *   reassigning an order to a different Customer
    *********************************************************/
    test("changing child's parent entity removes it from old parent", function () {
        expect(4);
        var em = newEm();
        var customer1 = getFakeExistingCustomer(em, "Customer 1");
        var customer2 = getFakeExistingCustomer(em, "Customer 2");
        
        var newOrder = createOrder();
        em.addEntity(newOrder);

        newOrder.Customer(customer1); // assign order to customer1

        ok(customer1.Orders().indexOf(newOrder) >= 0,
            "customer1 has the order after setting the order to customer1");
        equal(customer2.Orders().length, 0,
            "customer2 has no orders after setting the order to customer1");
        
        newOrder.Customer(customer2); // move order to customer2

        equal(customer1.Orders().length, 0,
            "customer1 has no orders after moving order to customer2");
        ok(customer2.Orders().indexOf(newOrder) >= 0,
            "customer2 has the order after moving order to customer2");
    });

    /*********************************************************
    * undoing a change of parent nav restores original state
    * for both the child entity and the related customers
    *********************************************************/
    test("undoing a change of parent nav restores original state", function () {
        expect(5);
        var em = newEm();
        var customer1 = getFakeExistingCustomer(em, "Customer 1");
        var customer2 = getFakeExistingCustomer(em, "Customer 2");

        var order = getFakeExistingOrder(em, "existing order", customer1);

        ok(customer1.Orders().indexOf(order) >= 0,
         "customer1 has the order before moving order to customer2");
        
        order.Customer(customer2); // move order to customer2

        equal(customer1.Orders().length, 0,
            "customer1 has no orders after moving order to customer2");
        ok(customer2.Orders().indexOf(order) >= 0,
            "customer2 has the order after moving order to customer2");

        order.entityAspect.rejectChanges(); // undo the move
        
        ok(customer1.Orders().indexOf(order) >= 0,
          "customer1 has the order after undoing the move");
        equal(customer2.Orders().length, 0,
            "customer2 has no orders after undoing the move");

    });

    /*********************************************************
    * deleting a child's parent clears the parent nav & defaults the parent FK
    * The child is left in a modified state, not deleted state; 
    * Breeze does not cascade delete.
    *********************************************************/
    test("deleting a child's parent clears the parent nav & defaults the parent FK", function () {
        expect(5);
        var em = newEm();
        var customer = getFakeExistingCustomer(em);
        var order = getFakeExistingOrder(em, "customer", customer);
        
        ok(customer.Orders()[0] === order,
            "customer's first order === order ");

        customer.entityAspect.setDeleted(); // delete the parent

        equal(customer.Orders().length, 0,
            "customer has no orders after deleting it");
        
        ok(order.Customer() === null,
            "order's Customer is null after deleting former parent customer");

        var defaultValue = order.entityType.getProperty("CustomerID").defaultValue;
        equal(order.CustomerID(), defaultValue,
            "order's CustomerID is its default value after deleting former parent customer");
        
        equal(order.entityAspect.entityState, EntityState.Modified,
             "order is modified after deletion of parent customer");
    });

    /*****************************
     * Deleting parent in 1-to-1 relationship modifies the child
     * because child has a FK property pointing to the parent which must be reset
     *****************************/
    test("Deleting parent in 1-to-1 relationship modifies the child", function () {
        var em = createEmForOneToOneTests();

        // add fake Parent and Child entities 
        var p1 = em.createEntity('Parent', { id: 1, name: 'P1' });
        var c1 = em.createEntity('Child', { id: 2, name: 'C1', parent: p1 });
        // as if queried from database
        em.acceptChanges();

        ok(!em.hasChanges(), 'should not have pending changes');

        p1.entityAspect.setDeleted() // Delete p1
        equal(p1.entityAspect.entityState.name, 'Deleted', 'parent marked deleted');
        equal(c1.entityAspect.entityState.name, 'Modified', 'child changed after parent deleted');
        equal(c1.getProperty('parentId'), null, 'child.parentId set to null');
    });

    /*****************************
     * Deleting child in 1-to-1 relationship does not modify the parent
     * because parent has no FK property pointing to the child
     * Defect: see https://github.com/Breeze/breeze.js/issues/104
     *****************************/
    test("Deleting child in 1-to-1 relationship does not modify the parent", function () {
        var em = createEmForOneToOneTests();

        // add fake Parent and Child entities 
        var p1 = em.createEntity('Parent', { id: 1, name: 'P1' });
        var c1 = em.createEntity('Child', { id: 2, name: 'C1', parent: p1 });
        // as if queried from database
        em.acceptChanges();

        ok(!em.hasChanges(), 'should not have pending changes');

        c1.entityAspect.setDeleted() // Delete c1
        equal(c1.entityAspect.entityState.name, 'Deleted', 'child marked deleted');
        equal(p1.entityAspect.entityState.name, 'Unchanged', 'parent unchanged after child deleted');

        var originalValues = p1.entityAspect.originalValues;
        equal(Object.keys(originalValues).length, 0,
            'parent\'s originalValues should be empty');
    });

    /*********************************************************
    * setting child's parent entity null removes it from old parent
    *********************************************************/
    test("setting child's parent entity null removes it from old parent", function () {
        expect(2);
        var em = newEm();
        var customer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);

        newOrder.Customer(customer); // assign order to customer1

        ok(customer.Orders().indexOf(newOrder) >= 0,
            "newOrder is among the customer's orders");
        
        newOrder.Customer(null); // set null to decouple the order from a customer

        ok(customer.Orders().indexOf(newOrder) === -1,
            "newOrder is no longer among the customer's orders");
    });

    /*********************************************************
    * setting unattached child's parent entity pulls it into cache
    * if you don't want this side-effect, 
    * set the FK instead of the parent navigation property
    *********************************************************/
    test("setting unattached child's parent entity pulls it into cache", function () {
        expect(3);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();

        equal(newOrder.entityAspect.entityState, breeze.EntityState.Detached,
            "newOrder's entityState is 'Detached' because not yet in cache");
        
        // N.B.: Have not added newOrder explicitly to cache.
        // Setting its parent Customer pulls it into the
        // manager of that parent Customer
        newOrder.Customer(existingCustomer);
        
        // Set the FK instead if you don't want to pull the order into cache
        // newOrder.CustomerID(existingCustomer.CustomerID());
        // em.addEntity(newOrder); // now must add explicitly

        equal(newOrder.entityAspect.entityState, breeze.EntityState.Added,
            "newOrder's entityState is 'Added' after setting its Customer");

        ok(newOrder.entityAspect.entityManager === em,
            "newOrder's entityManager is same as Customer's");

    });

    /*********************************************************
    * setting existing child's parent entity changes child's state
    * because we're setting a property of the child
    * That state does NOT change when the parent becomes available
    * via query.
    *********************************************************/
    test("setting existing child's parent entity changes child's state", function () {
        expect(1);
        var em = newEm();
        var existingOrder = getFakeExistingOrder(em);
        var existingCustomer = getFakeExistingCustomer(em);

        existingOrder.Customer(existingCustomer);

        equal(existingOrder.entityAspect.entityState, breeze.EntityState.Modified,
             "order's entityState is 'Modified' after setting its Customer");

    });
   /*********************************************************
   * throws exception if set a navigation property with
   * entity in a different EntityManager
   *********************************************************/
    test("exception if set nav to entity with different manager", function () {
        expect(2);
        var em1 = newEm();
        var existingOrder = getFakeExistingOrder(em1);

        var em2 = newEm();
        var existingCustomer = getFakeExistingCustomer(em2);

        raises(function() {
            existingOrder.Customer(existingCustomer);
        }, "throws exception because the order and customer are in different managers");

        ok(existingCustomer.entityAspect.entityManager !== existingOrder.entityAspect.entityManager,
            "existingCustomer and existingOrder have different managers");   

    });

    /*********************************************************
    * setting FK enables two-way navigation
    * Show that setting the FK enables corresponding navigations
    * Use case: 
    *   Creating a new Order and setting it's parent CustomerID
    *   when you don't have the Customer (which we do in this test)
    *********************************************************/
    test("setting FK enables two-way navigation", function () {
        expect(4);
        var em = newEm();
        var existingCustomer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);

        // The newOrder has no Customer 
        ok(newOrder.Customer() === null,
            'newOrder.Customer() === null before setting newOrder.CustomerID');

        var orderPropertyChanged = 0;
        newOrder.entityAspect.propertyChanged.subscribe(
            function () { orderPropertyChanged +=1; });

        newOrder.CustomerID(existingCustomer.CustomerID());

        // The order's Customer nav property works as soon as its ID is set.
        ok(newOrder.Customer() === existingCustomer,
            'newOrder.Customer() === existingCustomer after setting newOrder.CustomerID');

        equal(orderPropertyChanged, 2,
            "the new order's PropertyChanged event was raised twice");

        // Notice that the parent Customer immediately picks up this order!
        ok(existingCustomer.Orders().indexOf(newOrder) >= 0,
            'Customer.Orders() includes newOrder after setting newOrder.CustomerID');

    });
    /*********************************************************
    * changing FK to key of a different parent removes it from old parent
    *********************************************************/
    test("changing FK to key of a different parent removes it from old parent", function () {
        expect(3);
        var em = newEm();
        var customer1 = getFakeExistingCustomer(em, "Customer 1");
        var customer2 = getFakeExistingCustomer(em, "Customer 2");

        var newOrder = createOrder();
        em.addEntity(newOrder);

        newOrder.Customer(customer1); // assign order to customer1

        ok(customer1.Orders().indexOf(newOrder) >= 0,
            "newOrder is among customer1's orders");

        newOrder.CustomerID(customer2.CustomerID()); // change FK

        ok(customer1.Orders().indexOf(newOrder) === -1,
            "newOrder is no longer among customer1's orders");

        ok(customer2.Orders().indexOf(newOrder) >= 0,
            "newOrder is among customer2's orders");
    });
    /*********************************************************
    * changing FK to null removes it from old parent
    *********************************************************/
    test("changing FK to null removes it from old parent", function () {
        expect(2);
        var em = newEm();
        var customer = getFakeExistingCustomer(em);

        var newOrder = createOrder();
        em.addEntity(newOrder);

        newOrder.Customer(customer); // assign order to customer1

        ok(customer.Orders().indexOf(newOrder) >= 0,
            "newOrder is among customer's orders");

        newOrder.CustomerID(null); 

        ok(customer.Orders().indexOf(newOrder) === -1,
            "newOrder is no longer among customer's orders");
    });


    /*********************************************************
    * deferred get of OrderDetails via entityAspect.loadNavigationProperty 
    * *** This is the most simple and generally preferred approach ***
    *
    * Use case: 
    *   Have the order and the customer (by expand)
    *   but not the OrderDetails. Need them now, so use
    *   "loadNavigationProperty" to get them for the order
    *********************************************************/
    test("deferred get of OrderDetails for an order via 'loadNavigationProperty'", 7,
        loadOrderDetailsDeferred(queryOrderDetailsWithLoadNavigationProperty));

    // Get the OrderDetails using entityAspect.loadNavigationProperty
    function queryOrderDetailsWithLoadNavigationProperty(data) {
        var firstOrder = data.first;
        return firstOrder.entityAspect.loadNavigationProperty("OrderDetails");
    }

    /*********************************************************
    * deferred get of OrderDetails via regular query
    * See "loadNavigationProperty" alternative which is preferred.
    *********************************************************/
    test("deferred get of OrderDetails for an order via regular query", 8, 
        loadOrderDetailsDeferred(queryOrderDetailsWithRegularQuery));
 
    // Get the OrderDetails using a regular query
    function queryOrderDetailsWithRegularQuery(data) {
        var firstOrder = data.first;

        var query = EntityQuery.from("OrderDetails")
            .where("OrderID", "==", firstOrder.OrderID())
            .expand("Product");

        return firstOrder.entityAspect.entityManager.executeQuery(query)
            .then(assertGotProductsWithOrderDetails);
    }

    /*********************************************************
    * deferred get of OrderDetails via EntityQuery.fromEntityNavigation
    * See "loadNavigationProperty" alternative which is preferred.
    *********************************************************/
    test("deferred get of OrderDetails for an order via 'fromEntityNavigation'", 8, 
        loadOrderDetailsDeferred(queryOrderDetailsWithFromEntityNavigation));

    /*********************************************************
    * lazy load OrderDetails and products of several orders via EntityQuery.fromEntityNavigation
    * This somewhat tortured technique would be appropriate if you didn't want to specify
    * how the navigation query is implemented such as when writing a lazy loading utility
    * that lacks awareness of each navigation's implementation.
    *********************************************************/
    asyncTest("deferred get of OrderDetails & products for three orders via 'fromEntityNavigation'", function () {
      expect(7);

      var em = newEm();
      var orders;

      // Get first 3 Orders ... but not their details
      EntityQuery.from('Orders').take(3)
        .using(em).execute()
        .then(gotOrders)
        .then(confirmDetails)
        .catch(handleFail).finally(start);

      function gotOrders(data) {
        orders = data.results;
        if (orders.length !== 3) {
          throw new Error('expected 3 orders, got ' + orders.length);
        }

        // create an array of filter criteria (`wherePredicate`) for each order
        var predicates = orders.map(function (order) {
          return EntityQuery.fromEntityNavigation(order, 'OrderDetails')
                            .wherePredicate;
        });

        // OR the predicates together
        var filter = breeze.Predicate.or(predicates);

        return EntityQuery.from('OrderDetails')
          .where(filter)
          .expand('Product') // include the Products for these details
          .using(em).execute();
      }

      function confirmDetails(data) {
        ok(data.results.length > 0, ' navigation query returned results of length ' + data.results.length);

        orders.forEach(function (order) {
          var oid = order.getProperty('OrderID');
          var details = order.getProperty('OrderDetails');
          ok(details.length > 0, 'Order {0} has OrderDetails length: {1}'
            .format(oid, details.length));
          var od1 = details[0];
          if (od1) {
            var prod = od1.getProperty('Product');
            ok(prod, 'Order {0}\'s first OrderDetail has a Product entity, "{1}"'
              .format(oid, prod.getProperty('ProductName')));
          }
        });
      }
    });

    // Get the OrderDetails using EntityQuery.fromEntityNavigation
    function queryOrderDetailsWithFromEntityNavigation(data) {
        var firstOrder = data.first;

        var navProp = firstOrder.entityType.getNavigationProperty("OrderDetails");

        var navQuery = EntityQuery
            .fromEntityNavigation(firstOrder, navProp)
            .expand("Product");

        return firstOrder.entityAspect.entityManager.executeQuery(navQuery)
            .then(assertGotProductsWithOrderDetails);
    }

    /*********************************************************
    * A test helper to run the same basic test multiple ways.
    * Loads an order's OrderDetails using the technique 
    * expressed in the 'orderDetailsQueryFn'.
    *
    * Returns the body of the test function after injecting        
    * the 'orderDetailsQueryFn' with the technique we want to see.
    *********************************************************/
    function loadOrderDetailsDeferred(orderDetailsQueryFn) {

        return function () {
            // a query for a well-known order
            var alfredsFirstOrderQuery = new EntityQuery("Orders")
                .where(alfredsPredicate).take(1)
                .expand("Customer");

            var em = newEm();
            stop();
            // get an order via the well-known-order query,
            // then get related OrderDetails using 'orderDetailsQueryFn'
            // then assert that everything went well
            queryForOne(em, alfredsFirstOrderQuery, "Alfreds 1st order")
                .then(orderDetailsQueryFn)
                .then(assertGotOrderDetailsFromQuery)
                .fail(handleFail)
                .fin(start);
        };
    }

    function assertGotOrderDetailsFromQuery(data) {

        // Work the navigation chain from OrderDetails

        var details = data.results, count = details.length;
        ok(count, "count of OrderDetails from query = " + count);

        var firstDetail = details[0];

        var order = firstDetail.Order();
        ok(order !== null, "OrderDetail.Order returns the parent Order");

        equal(order && order.entityAspect.entityState, breeze.EntityState.Unchanged,
            "order's entityState remains 'Unchanged' after getting its details by query");

        equal(order && order.OrderDetails().length, details.length,
            "Parent Orders's OrderDetails is same length as details retrieved by query");

        var customer = order && order.Customer();
        ok(customer !== null, "parent Order returns its parent Customer");

        ok(customer && customer.CustomerID() === testFns.wellKnownData.alfredsID,
            "parent Customer by nav is Alfreds (in cache via initial query expand)");

        return data;
    }
    
    function assertGotProductsWithOrderDetails(data) {
        if (data.results.length !== 0) { // let another assert deal with no data.
            var firstDetail = data.results[0];
            ok(firstDetail.Product() !== null,
                "first OrderDetail's parent Product is in cache thanks to expand");
        };
        return data;
    }
    
    /*********************************************************
    * Can fill placeholder customer asynchronously
    *
    * Scenario: you know the ID but you don't have the data yet.
    * You want to give the caller a placeholder customer to display
    * and then fill it with proper values when they arrive
    * preserving object identity as you do so.
    *********************************************************/
    test("fill placeholder customer asynchronously", function () {
        expect(3);
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var customer = custType.createEntity();
        customer.CustomerID(testFns.wellKnownData.alfredsID);
        customer.CompanyName("[don't know name yet]");
        em.attachEntity(customer); // pretend it's real and unchanged

        var state = customer.entityAspect.entityState;
        ok(state.isUnchanged(),
            "placeholder customer '{0}' is in {1} state.".format(
            customer.CompanyName(), state));

        customer.CompanyName.subscribe(function (value) {
            // listen for KO to notify that name was refreshed
            ok(value.indexOf("Alfreds") !== -1,
                "Knockout notifies UI that CompanyName updated as expected to " + value);
        });

        // this refresh query will fill the customer values from remote storage
        var refreshQuery = breeze.EntityQuery.fromEntities(customer);

        stop(); // going async ...

        refreshQuery.using(em).execute()
        // At this point you would return the customer to the caller
        // who might data bind to it in a view.
        // The customer data would be "provisional" until the 
        // refreshQuery gets the actual values.

        // In this test we wait for the result to confirm that the
        // refreshed data have arrived and the customer become "real".
        .then(function (data) {
            var results = data.results, count = results.length;
            if (count != 1) {
                ok(false, "expected one result, got " + count);
            } else {
                ok(results[0] === customer,
                    "'refresh query' returned same customer as the placeholder in cache" +
                        " whose updated name is " + customer.CompanyName());
            }
        })
        .fail(handleFail)
        .fin(start);   // gets run after KO handler so restart the test runner here
    });

    /******* PECULIAR CASES ***********/

    /*********************************************************
    * can set child' parent navigation when both child and parent are detached
    * Use case: NONE ... don't do this. It may work but that is accidental
    *********************************************************/
    test("can set child' parent navigation when both child and parent are detached", function () {
        expect(5);
        var newCustomer = createCustomer();
        var newOrder = createOrder();

        equal(newCustomer.entityAspect.entityState, breeze.EntityState.Detached,
            "newCustomer's entityState is 'Detached' because not in cache");
        equal(newOrder.entityAspect.entityState, breeze.EntityState.Detached,
            "newOrder's entityState is 'Detached' because not in cache");

        newOrder.Customer(newCustomer);

        equal(newOrder.entityAspect.entityState, breeze.EntityState.Detached,
             "newOrder's entityState is 'Detached' after setting its Customer");

        ok(newOrder.Customer() === newCustomer,
            "newOrder.Customer returns the newCustomer");

        // This should fail
        ok(newCustomer.Orders().indexOf(newOrder) !== -1,
            "newOrder is among the newCustomer's orders");
    });

    /*********************************************************
    * helpers
    *********************************************************/
    // There is not one-to-one relationship in any sample model so we make one
    // Be sure to give this function an empty metadataStore or a clone!
    function AddOneToOneTypes(metadataStore) {
        var DT = breeze.DataType;

        metadataStore.addEntityType(new breeze.EntityType({
            shortName: "Parent",
            dataProperties: {
                id: { dataType: DT.Int32, isPartOfKey: true, isNullable: false },
                name: {}
            },
            navigationProperties: {
                child: {
                    entityTypeName: "Child",
                    associationName: "Parent_Child"
                }
            }
        }));

        metadataStore.addEntityType(new breeze.EntityType({
            shortName: "Child",
            dataProperties: {
                id: { dataType: DT.Int32, isPartOfKey: true, isNullable: false },
                name: {},
                parentId: { dataType: DT.Int32 }
            },
            navigationProperties: {
                parent: {
                    entityTypeName: "Parent",
                    associationName: "Parent_Child",
                    foreignKeyNames: ["parentId"] 
                }
            }
        }));
    }

    function createEmForOneToOneTests() {
        // create metadatastore w/ 1-to-1 relationship
        var metadataStore = new breeze.MetadataStore;
        AddOneToOneTypes(metadataStore);
        // create fake dataservice and create EM for that service
        var dataService = new breeze.DataService({
            serviceName: 'dummy',
            hasServerMetadata: false
        });
        metadataStore.addDataService(dataService);
        var manager = new breeze.EntityManager({
            dataService: dataService,
            metadataStore: metadataStore
        });
        return manager;
    }

    function getCustomerType() {
        return newEm.options.metadataStore.getEntityType("Customer");
    }

    function getFakeExistingCustomer(em, name) {
        name = name || "Existing Customer";
        var customer = createCustomer(name);
        customer.CustomerID(testFns.newGuidComb());
        em.attachEntity(customer);// pretend already exists
        return customer;
    }

    // new but not added to em
    function createCustomer(name) {
        name = name || "New customer";
        var customerType = getCustomerType();
        var customer = customerType.createEntity();
        customer.CompanyName(name);
        return customer;
    }
    
    function getOrderType() {
        return newEm.options.metadataStore.getEntityType("Order");
    }

    // new but not added to em
    function createOrder(shipName) {
        shipName = shipName || "New Order";
        var orderType = getOrderType();
        var order = orderType.createEntity();
        order.ShipName(shipName);
        return order;
    }

    function getFakeExistingOrder(em, shipName, customer) {
        shipName = shipName || "Existing Order";
        var order = createOrder(shipName);
        order.OrderID(testFns.getNextIntId());
        if (!!customer) {
            // setting the FK will keep the order from being
            // added to the customer's EntityManager;
            // we want to attach it as "existing" instead.
            order.CustomerID(customer.CustomerID());
        }
        em.attachEntity(order); // pretend already exists
        return order;
    }
})(docCode.testFns);