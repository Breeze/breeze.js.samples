/************************
 * Test orderItemOptionTypeVm:
 * Creates viewmodels of the orderItemOptionVms for a given OrderItem.
 * See orderItemOptionVm.js
 * There is one OptionType vm for each option type (e.g., 'sauce").
 * Each vm appears as one of the tabs on the orderItem view.
 *******************************/
describe("OrderItemOptionTypeVm: ", function () {

    var breeze, EntityQuery, lookups, manager, model, optionTypeVm;

    testFns.beforeEachApp('emFactoryMock');

    beforeEach(inject(function(_breeze_, entityManagerFactory, _lookups_, _model_, orderItemOptionTypeVm) {
        breeze = _breeze_;
        EntityQuery = breeze.EntityQuery;
        lookups = _lookups_;
        manager = entityManagerFactory.newManager();
        model = _model_;
        lookups.initialize(manager);
        optionTypeVm = orderItemOptionTypeVm;
    }));

    describe("when create OptionTypeVms for the 'Plain Cheese' pizza", function () {
        var orderItem, product, productOptions;
        beforeEach(function () {
            var order = createOrder();
            product = lookups.products.byId(1); // "Plain Pizza"
            orderItem = order.addNewItem(product);
            productOptions = lookups.productOptions.byProduct(product);
        });

        it("pizza has two vms", function () {
            var vms = optionTypeVm.createVms(orderItem);
            expect(vms.length).toEqual(2);
        });
        it("pizza has 'crust' and 'spice' vms in that order", function () {
            var vms = optionTypeVm.createVms(orderItem);
            expect(vms[0].type).toEqual('crust');
            expect(vms[1].type).toEqual('spice');
        });
    });


    describe("when create OptionTypeVms for the 'Chicken Caesar' salad", function () {
        var orderItem, product, productOptions;
        beforeEach(function () {
            var order = createOrder();
            product = lookups.products.byName("Chicken Caesar Salad")[0];
            orderItem = order.addNewItem(product);
            productOptions = lookups.productOptions.byProduct(product);
        });

        it("pizza has five vms", function () {
            var vms = optionTypeVm.createVms(orderItem);
            expect(vms.length).toEqual(5);
        });

        it("the title of the last salad dressing vm is in 'Title' case", function () {
            var vms = optionTypeVm.createVms(orderItem);
            expect(vms[4].title).toEqual('Salad Dressing');
        });
    });

    /* helpers */
    function createOrder(){
        var pending = lookups.OrderStatus.Pending;
        return model.Order.create(manager, { orderStatus: pending});
    }
});