/************************
 * Test the menu controller defined in menu.js
 *
 * To Test:
 * - each valid product type can return a products array
 * - invalid product type returns 'pizza' products
 * - can generate the right link for a product
 * - calling vm.go goes to the right view for the product
 *******************************/
describe("Menu Controller: ", function () {

    var controller,
        controllerFactory,
        controllerName='menu',
        dataserviceMock,
        expectedProducts,
        flush$q,
        $state;

    testFns.beforeEachApp();

    beforeEach(inject(function($controller, $q) {
        controllerFactory = $controller;
        flush$q = testFns.create_flush$q();
        dataserviceMock = new DataserviceMock($q);
    }));

    describeStateParamSpec('drink');
    describeStateParamSpec('pizza');
    describeStateParamSpec('salad');

    describe("given non-existent product type, 'foo', treated as 'pizza' ",  function(){
        beforeEach(function () {
            createControllerForProductType('foo');
        });
        runStateParamSpecs('pizza');
    });

    describe("given no product type, treated as 'pizza' ",  function(){
        beforeEach(function () {
            createControllerForProductType(undefined);
        });
        runStateParamSpecs('pizza');
    });

    describe("when select a pizza product", function () {
        var product = new ProductMock('pizza', 42);
        beforeEach(function () {
            createControllerForProductType('pizza');
        });

        it("asks the router for a link to display the right product in the right view", function () {
            var ref = controller.productRef(product);

            expect($state.href.calls.count()).toBe(1); // called once

            var goArgs = $state.href.calls.argsFor(0); // called with the right arguments
            expect(goArgs[0]).toBe('app.order.product'); // the right state
            expect(goArgs[1]).toEqual({productType : 'pizza', productId: 42}); // the right product
        });

        it("calls the router with the right state and params for this product", function () {
                controller.go(product);
                expect($state.go.calls.count()).toBe(1); // called once

                var goArgs = $state.go.calls.argsFor(0); // called with the right arguments
                expect(goArgs[0]).toBe('app.order.product'); // the right state
                expect(goArgs[1]).toEqual({productType : 'pizza', productId: 42}); // the right product
            });
        });

    /* spec helpers */
    function describeStateParamSpec(productType){

        describe("given $stateParams for the '"+productType+"' product type",  function(){
            beforeEach(function () {
                createControllerForProductType(productType);
            });
            runStateParamSpecs(productType);
        });
    }

    function createControllerForProductType(productType){
        $state = new $stateMock();
        var  ctorArgs ={
            $state: $state,
            $stateParams: {productType: productType },
            dataservice: dataserviceMock
        };
        expectedProducts = [new ProductMock(productType)];
        dataserviceMock.lookups.products.byTag.and.returnValue(expectedProducts);

        controller = controllerFactory(controllerName, ctorArgs);
        flush$q();
    }

    function $stateMock(){
        this.go = jasmine.createSpy('go');
        this.href = jasmine.createSpy('href');
    }

    function DataserviceMock($q){
        // dataservice.lookups.products.byTag
        this.lookups = {
                products:{
                    byTag: jasmine.createSpy('byTag')
                }
            };
        this.ready =  function (){ return $q.when();}
    }

    function ProductMock(type, id){
        this.type = type;
        this.id = id || 42;
    }

    function runStateParamSpecs(productType){
        it("exposes products of the '"+productType+"' product type", function(){
            var products = controller.products;
            expect(products).toEqual(expectedProducts);
        });

        it("exposes the '"+productType+"' view template", function(){
            var template = controller.template;
            var re = new RegExp(productType + ".html");
            expect(template).toMatch(re);
        });
    }
});