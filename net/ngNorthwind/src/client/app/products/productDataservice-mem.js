(function () {
    'use strict';

    angular
        .module('app.core')
        .service('productDataservice-mem', ProductDataservice);

    ProductDataservice.$inject = ['$q', '$timeout', 'logger', 'test-data'];

    /* @ngInject */
    function ProductDataservice($q, $timeout, logger, testData) {
        /*jshint validthis: true */
        var service = this;
        this.categoryNullo = categoryNullo;
        this.categories = function() {return testData.categories.slice();};
        this.createProduct = createProduct;
        this.getProducts = getProducts;
        this.getProductById = getProductById;
        this.hasChanges = false;
        this.name = 'In-memory productDataservice';
        this.ready = ready;
        this.rejectChanges = function(){}; // No implementation
        this.reset = getProducts; // mock implementation
        this.save = save;
        this.suppliers = function() {return testData.suppliers.slice();};
        this.supplierNullo = supplierNullo;

        ////////

        function createProduct() {
            logger.error('Create product is not yet implemented');
        }

        function getProducts() {
            return $q.when(testData.products.slice()); 
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

        function save() {
            logger.error('Save is not yet implemented');
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