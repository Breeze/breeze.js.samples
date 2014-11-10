(function () {
    'use strict';

    angular
        .module('app.core')
        .service('productDataservice', ProductDataservice);

    ProductDataservice.$inject = ['$injector', 'config'];

    /* @ngInject */
    function ProductDataservice($injector, config) {
        var ds = config.useBreeze ? 'productDataservice-bz' : 'productDataservice-mem';
        return $injector.get(ds);
    }
})();