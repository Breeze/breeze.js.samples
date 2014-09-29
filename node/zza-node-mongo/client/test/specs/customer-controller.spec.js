/************************
 * Test the customer controller defined in customer.js
 *
 * To Test:
 * - each valid product type can return a products array
 * - invalid product type returns 'pizza' products
 * - can generate the right link for a product
 * - calling vm.go goes to the right view for the product
 *******************************/
describe("Customer Controller: ", function () {

    var controller,
        controllerFactory,
        controllerName='customer',
        dataserviceMock,
        flush$q,
        $q,
        $rootScope;

    testFns.beforeEachApp( function($provide){
        $provide.service('dataservice', DataserviceMock);
    });

    beforeEach(inject(function($controller, _$q_, _$rootScope_, dataservice) {
        controllerFactory = $controller;
        $q = _$q_;
        $rootScope = _$rootScope_;
        dataserviceMock = dataservice;
        flush$q = function(){$rootScope.$apply();};
    }));

    describe("when created but not ready", function () {
        beforeEach(function(){
            var  ctorArgs = {
                'customer.state': {} // use the registered name, 'customer.state', not the parameter name
            };
            // Create controller, injecting its customer state constructor parameter
            controller = controllerFactory(controllerName, ctorArgs);
        });

        /* "Controller As" variation
        beforeEach(function(){
            var  ctorArgs = {
                '$scope' : $rootScope, // although not a controller parm, required by  "Controller As"
                'customer.state': {}   // use the registered name, 'customer.state', not the parameter name
            };
            // Create with "controller as" syntax
            controller = controllerFactory(controllerName + ' as vm', ctorArgs);
            // Can access the scope and the controller (vm) during test e.g.:
            //    $rootScope.vm.customerFilterText
        });
        */

        it("'getCustomers' was not called", function () {
            expect(dataserviceMock.getCustomers).not.toHaveBeenCalled();
        });

        it("has no customers yet", function () {
            var custs = controller.customers;
            expect(custs.length).toBe(0);
        });

        it("'isLoadingCustomers' is true", function () {
            expect(controller.isLoadingCustomers).toBe(true);
        });

    });

    describe("when ready and no previous customer.state", function () {
        beforeEach(function(){
            var  ctorArgs ={
                "customer.state": {}
            };
            controller = controllerFactory(controllerName, ctorArgs);
            flush$q(); // triggers autoload.
        });

        it("'getCustomers' was called", function () {
            expect(dataserviceMock.getCustomers).toHaveBeenCalled();
        });

        it("has customers after customer auto-load completes", function () {
            var custs = controller.customers;
            expect(custs.length).toBeGreaterThan(0);
        });

        it("isLoadingCustomers' is false", function () {
            expect(controller.isLoadingCustomers).toBe(false);
        });

        it("has no selected customer", function () {
            var selectedCustomer = controller.selectedCustomer;
            expect(selectedCustomer).toBeNull();
        });

        describe("when select a customer", function () {
            var cust;
            beforeEach(function () {
                cust = controller.customers[2];
                controller.select(cust);
            });

            it("has a selected customer", function(){
                expect(controller.selectedCustomer).toBe(cust);
            });

            it("invokes 'dataservice.getOrderHeadersForCustomer'", function () {
                expect(dataserviceMock.getOrderHeadersForCustomer).toHaveBeenCalled();
            });

            it("has orderHeaders", function () {
                // confirm no orderHeaders when we start
                var orderHeaders = controller.orderHeaders();// note fn call, not property
                expect(orderHeaders.length).toBe(0);

                var cust = controller.customers[1];
                controller.select(cust);
                flush$q(); // it gets the orderHeaders

                orderHeaders = controller.orderHeaders();// note fn call, not property
                expect(orderHeaders.length).toBeGreaterThan(0);
            });
        });

    });

    describe("when ready and have previous customer.state", function () {
        var customerState;
        beforeEach(function () {

            customerState = {
                customerFilterText: 's',
                selectedCustomerId: 2,
                orderHeaders: [1,2,3].map(function(id){return new OrderHeaderMock(id)})
            };

            var ctorArgs = {
                "customer.state": customerState
            };
            controller = controllerFactory(controllerName, ctorArgs);
            flush$q(); // triggers autoload.
        });

        it("has filtered customers", function () {
            var filteredCusts = controller.filteredCustomers(); // Note function call, not property
            expect(filteredCusts.length).toBeGreaterThan(0);
            expect(filteredCusts.length).toBeLessThan(controller.customers.length);
        });

        it("has expected filtered customers", function () {
            var filteredCusts = controller.filteredCustomers(); // Note function call, not property
            var allMatch = filteredCusts.every(function(c){
                return c.firstName[0] === 'S' || c.lastName[0] === 'S';
            });
            expect(allMatch).toBe(true);
        });

        it("has selected customer with previous customerId", function () {
            var selectedCustomer = controller.selectedCustomer;
            expect(selectedCustomer).not.toBeNull();
            expect(selectedCustomer.id).toEqual(customerState.selectedCustomerId);
        });

        it("has previous orderHeaders", function () {
            var orderHeaders = controller.orderHeaders(); // NOTICE the ()! View binds to fn, not property
            expect(orderHeaders).toEqual(customerState.orderHeaders);
        });

    });

    /* helpers */
    function DataserviceMock(){
        this.getCustomers =
            jasmine.createSpy('getCustomers').and.callFake(getCustomers);

        this.getOrderHeadersForCustomer =
            jasmine.createSpy('getOrderHeadersForCustomer').and.callFake(getOrderHeadersForCustomer);

        this.ready =
            jasmine.createSpy('ready').and.callFake(function (){ return $q.when();});
    }

    function getCustomers(){
        var custs = [1,2,3,4,5].map(function(id){return new CustomerMock(id)});
        return $q.when(custs);
    }

    function CustomerMock(id){
        this.id = id;
        this.firstName = ["John","Sally","Sue"][id % 3];
        this.lastName = ["Doe", "Page","Smith", "Bell"][id % 4];
    }

    function getOrderHeadersForCustomer(customer){
        var ohs = [1,2,3,4,5].map(function(id){return new OrderHeaderMock(id, customer.id)});
        return $q.when(ohs);
    }

    function OrderHeaderMock(id){
        //.select('id, statusId, status, ordered, delivered, deliveryCharge, itemsTotal');
        this.id = id;
    }
});