// Test the menu controller defined in menu.js
ddescribe("Menu Controller: ", function () {

    testFns.spyOnToastr();

    var controller,
        controllerFactory,
        controllerName='menu',
        dataservice,
        expectedProducts

    beforeEach( module('app', function($provide){
        dataservice = new DataServiceMock();
        $provide.value('dataservice', dataservice);
    }));

    beforeEach(inject(function($controller) {
        controllerFactory = $controller;
    }));

    describeStateParamSpec('drink');
    describeStateParamSpec('pizza');
    describeStateParamSpec('salad');

    describe("given non-existent product type, 'foo', treats as 'pizza' ",  function(){
        beforeEach(function () {
            createControllerForProductType('foo');
        });
        runStateParamSpecs('pizza');
    });

    describe("given no product type, treats as 'pizza' ",  function(){
        beforeEach(function () {
            createControllerForProductType(undefined);
        });
        runStateParamSpecs('pizza');
    });

    function describeStateParamSpec(productType){

        describe("given $stateParams for the '"+productType+"' product type",  function(){
            beforeEach(function () {
                createControllerForProductType(productType);
            });
            runStateParamSpecs(productType);
        });
    }

    function createControllerForProductType(productType){
        var  ctorArgs ={
            "$stateParams": $stateParams = {productType: productType },
            "dataservice" :  dataservice
        }
        expectedProducts = [new ProductMock(productType)];
        dataservice.products.byTag.and.returnValue(expectedProducts);

        controller = controllerFactory(controllerName, ctorArgs);
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


    /* To be tested */
    it("can tell UI-router to go to the state for the designated product");
    it("can generate a link to the UI-router state for the designated product.")


    function DataServiceMock(){
        this.products = {
            byTag: jasmine.createSpy('byTag')
        };
        this.ready =  function (success){ return (success) ? success() : undefined;}
    }

    function ProductMock(type, id){
        this.type = type;
        this.id = id || 42;
    }
});