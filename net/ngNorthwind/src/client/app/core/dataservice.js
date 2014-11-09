(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('dataservice', dataservice);

    dataservice.$inject = ['$injector', 'config'];

    function dataservice($injector, config) {
        var ds = config.useBreeze ? 'bz-dataservice' : 'mem-dataservice';
        return $injector.get(ds);
    }
})();