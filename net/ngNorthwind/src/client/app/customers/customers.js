﻿(function () {
    'use strict';

    angular
        .module('app.customers')
        .controller('Customers', Customers);

    Customers.$inject = ['customerDataservice', 'logger'];

    /* @ngInject */
    function Customers(dataservice, logger) {
        /*jshint validthis: true */
        var vm = this;
        vm.customers = [];
        vm.title = 'Customers';

        activate();

        function activate() {
            return getCustomers().then(function(){
                logger.info('Activated Customers View');
            });
        }

        function getCustomers() {
            return dataservice.getCustomers().then(function (data) {
                vm.customers = data;
                return data;
            });
        }
    }
})();
