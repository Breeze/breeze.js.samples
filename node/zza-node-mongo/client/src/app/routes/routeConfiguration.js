(function( define ) {
    "use strict";

    define( [ ], function( ) {

        function Routing( routeMap, $routeProvider )
        {
            routeMap.routes.forEach( function (route)
            {
                $routeProvider.when(route.path, route);
            });

            $routeProvider.otherwise({ redirectTo: '/' });

        };

        // Register an annotated construction function
        return ['routeMapProvider', '$routeProvider', Routing ];
    });

}( this.define ));


//
//
//(function() {
//    'use strict';
//
//
//
//
//
//    var app = angular.module('app')
//        .value('routes', routes)
//        .config(['routeMapProvider', '$routeProvider', function (routeMap, $routeProvider) {
//            navRoutes.forEach(function (route) {
//                setRouteResolve(route);
//                $routeProvider.when(route.path, route);
//            });
//        $routeProvider.otherwise({ redirectTo: '/' });
//    }]);
//
//    function setRouteResolve(route) {
//        var controllerName = route.controller;
//        var resolve = routeResolve[controllerName];
//        if (resolve) {
//            setDataServiceInit();
//            route.resolve = resolve;
//        }
//
//        function setDataServiceInit() {
//            if (!resolve.dataServiceInit) return;
//            // replace `true` with the dataServiceInit function.
//            var init = function(dataservice, logger) {
//                logger.log(controllerName + " is waiting for dataservice init");
//                return dataservice.initialize();
//            };
//            init.$inject = ['dataservice', 'logger'];
//            resolve.dataServiceInit = init;
//        }
//    }
//
//})();
