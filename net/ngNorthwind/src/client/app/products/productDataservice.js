(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('productDataservice', dataservice);

    dataservice.$inject = ['$injector', 'config'];

    function dataservice($injector, config) {
        var ds = config.useBreeze ? 'productDataservice-bz' : 'productDataservice-mem';
        return $injector.get(ds);
    }
})();