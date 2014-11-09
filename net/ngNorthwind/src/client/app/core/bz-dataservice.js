(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('bz-dataservice', dataservice);

    dataservice.$inject = ['$q', 'breeze', 'entityManagerFactory', 'logger'];

    /* @ngInject */
    function dataservice($q, breeze, emFactory, logger) {

        var manager = getEntityManager();
        var queried = {};

        var service = {
            categoryNullo: categoryNullo,
            // categories: see getLookups()
            createProduct: createProduct,
            getCustomers: getCustomers,
            getProducts: getProducts,
            getProductById: getProductById,
            // hasChanges
            name: 'Breeze dataservice',
            ready: ready,
            supplierNullo: supplierNullo
            // suppliers: see getSuppliers()
        };

        Object.defineProperty(service, 'hasChanges', 
            { get: manager.hasChanges.bind(manager) });

        return service;

        ///////////////////////////
        function createProduct() {
            return manager.createEntity('Product');
        }

        function getCustomers() {
            var resource = 'Customers';
            var query = breeze.EntityQuery.from(resource)
                .orderBy('companyName');

            // if previously queried
            // query the cache instead of the remote server
            if (queried[resource]){
                query = query.using(breeze.FetchStrategy.FromLocalCache);
            }

            return manager
                .executeQuery(query)
                .then(success(resource))
                .catch(failed(resource));
        }

        function getLookups() {
            return breeze.EntityQuery.from('Lookups')
                .using(manager).execute()
                .then(success)
                .catch(failed('Lookups'));

            function success(data){
                var lups = data.results[0]
                service.categories = lups.categories;
                return lups;
            }
        }

        function getProducts(forceRefresh) {
            var resource = 'Products';
            var query = breeze.EntityQuery.from(resource)
                .orderBy('productName');

            // if should get from cache and previously queried
            // query the cache instead of the remote server
            if (!forceRefresh && queried[resource]){
                query = query.using(breeze.FetchStrategy.FromLocalCache);
            }

            return manager
                .executeQuery(query)
                .then(success(resource))
                .catch(failed(resource));
        }

        function getProductById(id, forceRemote) {
            return manager.fetchEntityByKey('Product', [id], !forceRemote)
            .then(success)
            .catch(failed('Product with id:' + id));

            function success(data) {
                return data.entity;
            }
        }

        function getSuppliers() {
            return breeze.EntityQuery.from('Suppliers')
                .orderBy('companyName')
                .using(manager).execute()
                .then(success)
                .catch(failed('Suppliers'));

            function success(data){
                var suppliers = data.results;
                service.suppliers = suppliers
                return suppliers;
            }
        }

        // returns a promise which resolves to this service after initialization
        function ready(){
            // The app is ready when we've loaded the lookups
            // and the suppliers
            var promise = $q.all([getLookups(), getSuppliers()])
                            .then(function(){
                                logger.info('Loaded lookups and suppliers');
                                return service;
                            })
                            .catch(failed('Ready'));

            // subsequent calls just get the promise
            service.ready = function(){return promise;}; 

            return promise;          
        }

        ///// helpers       

        function getEntityManager() {

            // No suppliers in the IdeaBlade sampleservice
            // redefine getSuppliers function to return nothing
            if (emFactory.isSampleService)  {
                getSuppliers = function() {
                    return $q.when([]); // return empty suppliers
                };
            } 

            return emFactory.manager;        
        } 

        function failed(resource){
            return function(error) {
                var msg = resource + ' query failed:\n' + error.message;
                logger.error(msg);
            };
        }

        function results(data) {
            return data.results;
        }

        function success(resource){
            return function(data){
               queried[resource]=true; // remember we queried it
               return data.results;             
            };
        }


        var _categoryNullo;
        function categoryNullo(){
            return _categoryNullo || (
                _categoryNullo = manager.createEntity('Category', 
                {
                    categoryID: 0,
                    categoryName: '-- Select a category --'
                }
                , breeze.EntityState.Unchanged)
            );
        }

        var _supplierNullo;
        function supplierNullo(){
            return _supplierNullo || (
                _supplierNullo = manager.createEntity('Supplier', 
                {
                    supplierID: 0,
                    companyName: '-- Select a supplier --'
                }
                , breeze.EntityState.Unchanged)
            );
        }

    }
})();