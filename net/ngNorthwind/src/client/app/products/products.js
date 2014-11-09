(function () {
    'use strict';

    angular
        .module('app.products')
        .controller('Products', Products);

    Products.$inject = ['$location', 'productDataservice', 'logger'];

    /* @ngInject */
    function Products($location, dataservice, logger) {
        /*jshint validthis: true */
        var vm = this;
        vm.gotoProduct = gotoProduct;
        vm.products = [];
        vm.refresh = refresh;
        vm.title = 'Products';

        activate();

        function activate() {
            return getProducts().then(function(){
                logger.info('Activated Products View');
            });
        }

        function getProducts(forceRefresh) {
            return dataservice.getProducts(forceRefresh).then(function (data) {
                vm.products = data;
                return data;
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
    }
})();