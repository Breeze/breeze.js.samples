(function () {
    'use strict';

    angular
        .module('app.products')
        .controller('ProductDetail', ProductDetail);

    ProductDetail.$inject = ['$location', '$routeParams', '$window', 'dataservice', 'logger'];

    /* @ngInject */
    function ProductDetail($location, $routeParams, $window, dataservice, logger) {
        /*jshint validthis: true */
        var vm = this;
        vm.cancel = cancel;
        // vm.canSave
        // vm.categories - see initLookups
        vm.deleteProduct = deleteProduct;
        vm.goBack = goBack;
        vm.hasChanges = false;
        vm.isSaving = false;
        vm.product = undefined;
        vm.save = save;
        // vm.suppliers - see initLookups

        Object.defineProperty(vm, 'canSave', { get: canSave });

        activate();

        function activate() {
            return getRequestedProduct().then(function(){
                    initLookups();
                    logger.info('Activated ProductDetails View');
                });
        }

        function cancel() {
            var aspect = vm.product.entityAspect;
            aspect.rejectChanges();
            if (aspect.entityState.isDetached()) {
                gotoProducts();
            }
        }

        function canSave() {
            return dataservice.hasChanges && !vm.isSaving;
        }

        function deleteProduct() {
            logger.error('Delete product is not yet implemented');
        }

        function getRequestedProduct() {
            var id = $routeParams.id;

            if (id === 'new') {
                vm.product = dataservice.createProduct();
                return $.when(vm.product);
            }

            return dataservice.getProductById(id)
                .then(function (product) {
                    if (product) {
                        vm.product = product;
                    } else {
                        logger.warning('Could not find product id = ' + id);
                        gotoProducts();
                    }
                })
                .catch(function (error) {
                    logger.error('Error while getting product id = ' + id + '; ' + error);
                    gotoProducts();
                });
        }

        function goBack() {
            $window.history.back();
        }

        function gotoProducts() {
            $location.path('/products');
        }

        function initLookups(){
            // initialize the combos
            vm.categories = dataservice.categories;
            vm.categories.unshift(dataservice.categoryNullo());
            vm.suppliers = dataservice.suppliers;
            vm.suppliers.unshift(dataservice.supplierNullo());
        }

        function save() {
            logger.error('Save is not yet implemented');
        }

    }
})();