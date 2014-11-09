(function () {
    'use strict';

    angular
        .module('app.products')
        .run(appRun);

    appRun.$inject = ['routehelper'];

    /* @ngInject */
    function appRun (routehelper){
        routehelper.configureRoutes(getRoutes());
    }

    function getRoutes() {
        return [
            {
                url: '/products',
                config: {
                    title: 'products',
                    controller: 'Products',
                    controllerAs: 'vm',
                    templateUrl: 'app/products/products.html',
                    settings: {
                        nav: 2,
                        content: '<i class="fa fa-gift"></i> Products'
                    }
                }
            },
            {
                url: '/product/:id',
                config: {
                    controller: 'ProductDetail',
                    controllerAs: 'vm',
                    templateUrl: 'app/products/productdetail.html',
                }
            }
        ];
    }
})();