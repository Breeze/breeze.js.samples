(function (define){
    'use strict';

    define(
        [
            'app/controllers/appController',
            'app/controllers/cartController',
            'app/controllers/dashboardController',
            'app/controllers/homeController',
            'app/controllers/orderItemController',
            'app/controllers/orderProductController',
            'app/controllers/routeController',
            'app/controllers/testController',
            'app/directives/appVersion',
            'app/directives/productSrc',
            'app/filters/toTitle',
            'app/services/databaseReset',
            'app/services/dataservice',
            'app/services/entityManagerFactory',
            'app/services/logger',
            'app/services/model',
            'app/services/pricing',
            'app/services/routes',
            'app/services/util',
            'app/config/metadata',
            'app/config/environment',
            'app/config/configuration',
            'app/config/initialization',
            'app/routes/routeMap',
            'app/routes/routeConfiguration'

        ],
        function (
            appController,          cartController,
            dashboardController,    homeController,
            orderItemController,    orderProductController,
            routeController,        testController,
            appVersion,             productSrc,
            filterToTitle,
            databaseReset,          dataservice,
            entityManagerFactory,   logger,
            model,                  pricing,
            routes,                 util,
            metadata,               environment,
            configuration,          initialization,
            routeMapProvider,       routeConfiguration )
        {
            // Create the 'app' module
            var app = angular.module('app', ['ui.bootstrap', 'breeze.angular']);

            app.provider(   "routeMap",              routeMapProvider )
               .factory(    "databaseReset",         databaseReset )
               .factory(    "dataservice",           dataservice )
               .factory(    "entityManagerFactory",  entityManagerFactory )
               .factory(    "logger",                logger )
               .factory(    "model",                 model )
               .factory(    "pricing",               pricing )
               .factory(    "util",                  util )
               .factory(    "config",                configuration )
               .controller( "appController",         appController )
               .controller( "homeController",        homeController )
               .controller( "cartController",        cartController )
               .controller( "dashboardController",   dashboardController )
               .controller( "orderItemController",   orderItemController )
               .controller( "orderProductController",orderProductController )
               .controller( "routeController",       routeController)
               .controller( "testController",        testController)
               .directive(  "appVersion",            appVersion )
               .directive(  "productSrc",            productSrc )
               .filter(     "toTitle",               filterToTitle[0] )
               .constant(   "environment",           environment[0] )
               .constant(   "metadata",              metadata[0] )
               .config( routeConfiguration )
               .run( ['util', postBoot ] );

                function postBoot( util ) {
                    // configure toastr for this app
                    toastr.options.timeOut = 2000; // 2 second toast timeout
                    toastr.options.positionClass = 'toast-bottom-right';

                    util.logger.log("app module is loaded and running on " + util.config.server);
                }
        }
    );



})( this.define );


