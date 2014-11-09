(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('mem-dataservice', dataservice);

    dataservice.$inject = ['$q', '$timeout', 'logger', 'test-data'];

    /* @ngInject */
    function dataservice($q, $timeout, logger, testData) {
        var products;

        var service = {
            categories: testData.categories,
            createProduct: createProduct,
            getCustomers: getCustomers,
            getProducts: getProducts,
            getProductById: getProductById,
            hasChanges: false,
            name: 'In-memory dataservice',
            suppliers: testData.suppliers,
            ready: ready,
        };

        return service;

        ////////
         function createProduct() {
            logger.error('Create product is not yet implemented');
        }

        function getCustomers() {
            return $q.when(testData.customers);
        }

        function getProducts() {
            return $q.when(testData.products); 
        }

        function getProductById(id){
            var entity = testData.products.filter(function(p){
                return p.productID === id;
            })[0];

            if (!entity) {
                entity = null;
                logger.warning('Could not find Product with id:' + id);
            }
            return entity;          
        }

        function ready(){
            var deferred = $q.defer();

            // Simulate data access initialization with a 1 second delay.
            $timeout(function () {
                deferred.resolve(true);
            }, 1000);

            // subsequent calls just get the promise
            service.ready = function(){return deferred.promise;}; 

            return deferred.promise;          
        }
    }
})();