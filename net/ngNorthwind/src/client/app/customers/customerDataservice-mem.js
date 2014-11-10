(function () {
    'use strict';

    angular
        .module('app.core')
        .service('customerDataservice-mem', CustomerDataservice);

    CustomerDataservice.$inject = ['$q', 'test-data'];
    
    /* @ngInject */
    function CustomerDataservice($q, testData) {
        this.getCustomers = getCustomers;
        this.name = 'In-memory customerDataservice';

        ////////
        function getCustomers() {
            return $q.when(testData.customers);
        }
    }
})();