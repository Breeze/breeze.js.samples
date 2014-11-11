(function () {
    'use strict';

    angular
        .module('app.products')
        .controller('Products', Products);

    Products.$inject = ['$location', 'productDataservice', 'logger'];

    /* @ngInject */
    function Products($location, dataservice, logger) {
        var vm = this;
        vm.cancel = cancel;
        // vm.canSave
        vm.gotoProduct = gotoProduct;
        vm.isSaving = false;
        vm.products = [];
        vm.refresh = refresh;
        vm.reset = reset;        
        vm.save = save;
        vm.title = 'Products';

        Object.defineProperty(vm, 'canSave', { get: canSave });

        activate();

        function activate() {
            return getProducts().then(function(){
                logger.info('Activated Products View');
            });
        }

        function cancel() {
            dataservice.rejectChanges();
            getProducts();
        }

        function canSave() {
            return dataservice.hasChanges && !vm.isSaving;
        }

        function getProducts(forceRefresh) {
            return dataservice.getProducts(forceRefresh).then(function (products) {
                vm.products = products;
                return products;
            });
        }

        function gotoProduct(product){
            if (product && product.productID) {
                $location.path('/product/' + product.productID);
            }
        }

        function refresh(){
            logger.info('Refreshing products list from database');
            getProducts(true);
        }

        function reset() {
            dataservice.reset().then(function(products){
                vm.products = products;
                return products;
            });
        } 

        function save() {
            if (canSave()) {
                dataservice.save();
            }
        }
    }
})();