(function(angular) {

    'use strict';
    /**
     * @emFactoryMock module
     * @name emFactoryMock
     * @description
     *
     * # emFactoryMock
     *
     * The `emFactoryMock` module provides a decorator of the app's EntityManagerFactory
     * that can be inspected and controlled in a synchronous manner within test code.
     *
     * Populates a new manager with lookups test data
     * Sets the default fetch strategy to FetchStrategy.FromLocalCache
     *
     */
    angular.module('emFactoryMock', ['app']).config(['$provide', function($provide) {
        $provide.decorator('entityManagerFactory', entityManagerFactoryDecorator);
    }]);

    function entityManagerFactoryDecorator($delegate) {
        var manager = null;
        var emFactory = {
            manager: manager,      // direct access to the last manager from newManager()
            newManager: newManager // function called by services
        };
        return emFactory;
        //////////////////
        function newManager() {
            manager = $delegate.newManager();
            emFactory.manager = manager;

            // Prime with lookups data
            manager.importEntities(testFns.lookupsExport);

            // prevent default queries from going remote;
            setManagerToFetchFromCache();

            return manager;
        }

        /*******************************************************
         * In sync tests we want queries to fetch from cache by default
         *******************************************************/
        function setManagerToFetchFromCache() {
            manager.setProperties({
                queryOptions: new breeze.QueryOptions({
                    // query the cache by default
                    fetchStrategy: breeze.FetchStrategy.FromLocalCache
                })
            });

            // map 'Lookups' resource to something ('OrderStatus' will do) so
            // a breeze.EntityQuery.from('Lookups') query against cache won't fail
            // Assumes the caller doesn't actually do anything with the query result
            var metadataStore = manager.metadataStore;
            metadataStore.setEntityTypeForResourceName('Lookups', 'OrderStatus')
        }

    }

})(window.angular);
