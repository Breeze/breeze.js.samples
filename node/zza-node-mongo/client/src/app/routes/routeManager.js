(function( angular ) {
    "use strict";

    angular.module( "app" )
           .config( 'routeManager', routeManager );

        // **************************************
        // Private construction function
        // **************************************

        function routeManager( routeMap, $routeProvider )
        {
            updateRouteResolvers( routeMap );

            routeMap.routes.forEach( function (route)
            {
                $routeProvider.when(route.path, route);
            });

            $routeProvider.otherwise({ redirectTo: '/' });
        };

        /**
         * For each route, lookup to see if a special `resolve` function should be
         * prepared
         * @param map
         * @returns {*}
         */
        function updateRouteResolvers( map )
        {
            map.routes.forEach( function( route )
            {
                var item = map.routesToResolve[ route.controller ];
                if ( item )
                {
                    route.resolve = buildResolver( item );
                }
            });

            delete map.routesToResolve;
            return map;
        }

        /**
         * Build a resolve function that initializes the dataservice
         * for the controller/route
         */
        function buildResolver( info )
        {
            if ( info && info.dataServiceInit )
            {
                // replace `true` with the dataServiceInit function.
                info.dataServiceInit = ['dataservice', 'logger', initializeDataservice ];
            }

            return info;
        }

        /**
         * Use the injected dataservice to resolve() dataservice `ready` for route changes
         * @returns {*}
         */
        function initializeDataservice( dataservice, logger)
        {
            logger.log(controllerName + " is waiting for dataservice init");
            return dataservice.initialize();
        }

}( this.angular ));
