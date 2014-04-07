/************************
 * Test orderItemOptionTypeVm
 * Creates viewmodels for every ProductOption available for the product of a given OrderItem.
 * One such vm for each option type (e.g., 'pesto sauce").
 * These vms appear in the tabs on the orderItem view.
 *******************************/
describe("OrderItemOptionVm: ", function () {

    var breeze, lookups, manager, model, optionVm;

    testFns.beforeEachApp('emFactoryMock');

    beforeEach(inject(function(_breeze_, entityManagerFactory, _lookups_, _model_, orderItemOptionVm) {
        manager = entityManagerFactory.newManager();
        lookups = _lookups_;
        lookups.initialize(manager);
        model = _model_;
        optionVm = orderItemOptionVm;

        breeze = _breeze_;
    }));

    // Verify that the mocking emFactory actually works
    // Todo: could verify the mock emFactory elsewhere
    describe("when mocking entityManagerFactory", function () {
        it("the manager has OrderStatus entities in cache", function () {
            var statuses = manager.getEntities('OrderStatus');
            expect(statuses.length).toBeGreaterThan(1);
        });

        it("a query targets the cache (rather than the server)", function () {
            inject(function($rootScope){
                breeze.EntityQuery.from('Products').using(manager).execute()
                    .then(success).catch(testFns.failed);

                $rootScope.$digest(); // flush the async fn queue

                // If query were not actually synchronous
                // this method would not be called before the test ended.
                // Can check network traffic to confirm
                function success(data){
                    var products = data.results;
                    expect(products.length).toBeGreaterThan(1);
                }
            })
        });
    });

    describe("when create vms for the 'Plain Cheese' pizza", function () {
        var orderItem, product, productOptions;
        beforeEach(function () {
            var order = createOrder();
            product = lookups.products.byId(1); // "Plain Pizza"
            orderItem = order.addNewItem(product);
            productOptions = lookups.productOptions.byProduct(product);
        });

        it("pizza has as many vms as product options", function () {
            var vms = optionVm.createVms(orderItem);
            expect(vms.length).toEqual(productOptions.length);
        });

        it("every productOption has a vm", function () {
            var vms = optionVm.createVms(orderItem);
            var good = productOptions.every(function(po){
                for (var i=vms.length; i--;){
                    if (vms[i].productOption === po){
                        return true;
                    }
                }
                return false;
            });
            expect(good).toBe(true);
        });

        it("vm is selected when pizza has corresponding option", function () {
            var ix = 2; // give it one selected option
            orderItem.addNewOption(productOptions[ix]);
            var vms = optionVm.createVms(orderItem);
            expect(vms[ix].selected).toBe(true);
        });

        it("vm has the item option when pizza has corresponding option", function () {
            var ix = 2; // give it one selected option
            var option = orderItem.addNewOption(productOptions[ix]);
            var vms = optionVm.createVms(orderItem);
            expect(vms[ix].itemOption).toBe(option);
        });

        it("no vm is selected except one corresponding to an item option", function () {
            var ix = 2; // give it one selected option
            var option = orderItem.addNewOption(productOptions[ix]);
            var vms = optionVm.createVms(orderItem);
            var bad = vms.some(function(vm){return vm.selected && vm.itemOption !== option;});
            expect(bad).toBe(false);
        });

        it("it has fewer options than a 'Make Your Own' pizza", function () {
            var myo = lookups.products.byId(2); // "Make your own"
            var myoOptions = lookups.productOptions.byProduct(myo);
            var vms = optionVm.createVms(orderItem);
            expect(vms.length).toBeLessThan(myoOptions.length);
        });

    });

    /* helpers */
    function createOrder(){
        var pending = lookups.OrderStatus.Pending;
        return model.Order.create(manager, { orderStatus: pending});
    }
});