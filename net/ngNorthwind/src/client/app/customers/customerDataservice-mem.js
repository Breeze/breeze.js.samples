(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('customerDataservice-mem', dataservice);

    dataservice.$inject = ['$q', 'test-data'];

    /* @ngInject */
    function dataservice($q, testData) {

        var service = {
            getCustomers: getCustomers,
            name: 'In-memory customerDataservice'
        };

        return service;

        ////////
        function getCustomers() {
            return $q.when(testData.customers);
        }
    }
})();