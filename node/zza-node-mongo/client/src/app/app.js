/* 
   This script must run before all others.
   The load order of the other scripts should be immaterial
*/
(function (define){
    'use strict';

    var initDataServices = [ 'dataservice', 'util', initializeServices];

    define(
        [
            'app/controllers/AppController',
            'app/controllers/CartController',
            'app/controllers/DashboardController',
            'app/controllers/HomeController',
            'app/controllers/OrderItemController',
            'app/controllers/OrderProductController',
            'app/controllers/RouteController',
            'app/controllers/TestController',

            'app/directives/appVersion',
            'app/directives/productSrc',

            'app/services/databaseReset'

        ],
        function(
            AppController,       CartController,
            DashboardController, HomeController,
            OrderItemController, OrderProductController,
            RouteController,     TestController,
            appVersion,          productSrc,
            databaseReset        )
        {
            // Create the 'app' module
            var app = angular.module('app', ['ui.bootstrap']);

            app.factory( "databaseReset",           databaseReset )

               .controller("appController",         AppController )
               .controller("cartController",        CartController )
               .controller("dashboardController",   DashboardController )
               .controller("homeController",        HomeController )
               .controller("orderItemController",   OrderItemController )
               .controller("orderProductController",OrderProductController )
               .controller("routeController",       RouteController)
               .controller("testController",        TestController)

               .directive( "appVersion",            appVersion)
               .directive( "productSrc",            productSrc)

               .run( initDataServices );

            app.routeResolve = {
                cartController          : { dataServiceInit: true },
                orderItemController     : { dataServiceInit: true },
                orderProductController  : { dataServiceInit: true }
            };

        }
    );

    // *********************************************************
    // Private methods
    // *********************************************************

    /**
     * initialize dataservice on launch, even if don't need data yet
     */
    function initializeServices(dataservice, util)
    {
        dataservice.initialize();
        util.logger.log("app module is loaded and running on " + util.config.server);
    }



})(this.define);


