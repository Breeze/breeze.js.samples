(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('productDataservice-mem', dataservice);

    dataservice.$inject = ['$q', '$timeout', 'logger', 'test-data'];

    /* @ngInject */
    function dataservice($q, $timeout, logger, testData) {

        var service = {
            categoryNullo: categoryNullo,
            categories: function() {return testData.categories.slice();},
            createProduct: createProduct,
            getProducts: getProducts,
            getProductById: getProductById,
            hasChanges: false,
            name: 'In-memory productDataservice',
            ready: ready,
            suppliers: function() {return testData.suppliers.slice();},
            supplierNullo: supplierNullo
        };

        return service;

        ////////

        function createProduct() {
            logger.error('Create product is not yet implemented');
        }

        function getProducts() {
            return $q.when(testData.products); 
        }

        function getProductById(id){
            id = +id; // coerce to number
            var entity = testData.products.filter(function(p){
                return p.productID === id;
            })[0];

            if (!entity) {
                entity = null;
                logger.warning('Could not find Product with id:' + id);
            }
            return $q.when(entity);          
        }

        // returns a promise which resolves to this service after initialization
        function ready(){
            var deferred = $q.defer();

            // Simulate data access initialization with a 1 second delay.
            $timeout(function () {
                deferred.resolve(service);
            }, 1000);

            // subsequent calls just get the promise
            service.ready = function(){return deferred.promise;}; 

            return deferred.promise;          
        }

        ///// Helpers

        function categoryNullo(){
            return {categoryID: 0, categoryName:  '-- Select a category --'};
        }

        function supplierNullo(){
            return {supplierID: 0, companyName:  '-- Select a supplier --'};
        }
    }
})();