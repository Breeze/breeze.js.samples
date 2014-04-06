/************************
 * Test OptionTypeVm type - an internal ViewModel for an optionType
 * of the OrderItemOptions for a particular product type
 * The orderItem controller creates and displays instances of OptionTypeVm
 *
 *******************************/
describe("OptionTypeVm: ", function () {

    var breeze, emFactory, EntityQuery, manager, OptionTypeVm;

    testFns.beforeEachApp('emFactoryMock');
    //beforeEach(angular.mock.module('app', testFns.appStartMock, 'emFactoryMock'));

    beforeEach(inject(function(_breeze_, entityManagerFactory, _OptionTypeVm_) {
        breeze = _breeze_;
        EntityQuery = breeze.EntityQuery;

        emFactory = entityManagerFactory;
        manager = emFactory.newManager();
        OptionTypeVm = _OptionTypeVm_;
    }));

    // Verify that the mocking emFactory actually works
    describe("when mocking entityManagerFactory", function () {
        it("the manager has OrderStatus entities in cache", function () {
            var statuses = manager.getEntities('OrderStatus');
            expect(statuses.length).toBeGreaterThan(1);
        });
    });

    /* spec helpers */
    function getProducts(type){
        var query = EntityQuery.from('Product');
        if (type){
            query = query.where('type', 'eq', type.toLowerCase());
        }
        return manager.executeQueryLocally(query);
    }

});