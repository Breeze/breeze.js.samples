(function () {
    'use strict';

    angular
        .module('app.core')
        .service('customerDataservice', CustomerDataservice);

    CustomerDataservice.$inject = ['$injector', 'config'];

    /* @ngInject */
    function CustomerDataservice($injector, config) {
        var ds = config.useBreeze ? 'customerDataservice-bz' : 'customerDataservice-mem';
        return $injector.get(ds);
    }
})();