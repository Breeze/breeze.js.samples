(function () {
    'use strict';

    angular
        .module('app.core')
        .service('customerDataservice-bz', CustomerDataservice);

    CustomerDataservice.$inject = ['$q', 'breeze', 'entityManagerFactory', 'logger'];

    function CustomerDataservice($q, breeze, emFactory, logger) {
        var manager = emFactory.manager;
        var hasQueriedCustomer = false;

        this.getCustomers = getCustomers;
        
        ///////////////////////////

        function getCustomers() {
            var query = breeze.EntityQuery.from('Customers')
                .orderBy('companyName');

            // if previously queried
            // query the cache instead of the remote server
            if (hasQueriedCustomer){
                query = query.using(breeze.FetchStrategy.FromLocalCache);
            }

            return manager
                .executeQuery(query)
                .then(success)
                .catch(failed);

            function success(data){
               hasQueriedCustomer=true; // remember we queried it
               return data.results;             
            }

            function failed(error){
                var msg = 'Customer query failed:\n' + error.message;
                logger.error(msg);
                return $q.reject(error); //pass error along
            }

        }
    }
})();