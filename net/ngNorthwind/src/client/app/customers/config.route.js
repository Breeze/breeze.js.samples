(function () {
    'use strict';

    angular
        .module('app.customers')
        .run(appRun);

    // appRun.$inject = ['routehelper']; 

    /* @ngInject */
    function appRun(routehelper) {
        routehelper.configureRoutes(getRoutes());
    }

    function getRoutes() {
        return [
            {
                url: '/',
                config: {
                    templateUrl: 'app/customers/customers.html',
                    controller: 'Customers',
                    controllerAs: 'vm',
                    title: 'Customers',
                    settings: {
                        nav: 1,
                        content: '<i class="fa fa-university"></i> Customers'
                    }
                }
            }
        ];
    }
})();