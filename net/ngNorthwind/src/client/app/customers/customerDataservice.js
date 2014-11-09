(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('customerDataservice', dataservice);

    dataservice.$inject = ['$injector', 'config'];

    function dataservice($injector, config) {
        var ds = config.useBreeze ? 'customerDataservice-bz' : 'customerDataservice-mem';
        return $injector.get(ds);
    }
})();