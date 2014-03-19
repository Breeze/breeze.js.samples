(function(define) {
    'use strict';

    define([ ], function() {

        function AppController( $rootScope, logger )
        {
            var vm = this;

            vm.name = "app";

            $rootScope.$on('$routeChangeStart',   onStart_RouteChange);
            $rootScope.$on('$routeChangeSuccess', onSuccess_RouteChange);
            $rootScope.$on('$routeChangeError',   onError_RouteChange);
            $rootScope.$on('$routeUpdate',        onUpdate_RouteChange );


            // *********************************************************
            // Private methods
            // *********************************************************

            function onError_RouteChange(event, current, previous, rejection)
            {
                logger.log( rejection || "failed to change routes" );
            }

            function onStart_RouteChange(event, next, current)
            {
                var leaving = current ? "Leaving " + current.path + ". " : "";
                logger.log(leaving + "Going to " + next.path);
            }

            function onSuccess_RouteChange(event, current, previous)
            {
                logger.log("Route change succeeded; arriving at " + current.path);
            }

            function onUpdate_RouteChange(event)
            {
                logger.log("Reloading the route with different query params, keeping the same controller instance");
            }
        }

        return [ '$scope', 'logger', AppController ];
    });

})(this.define);
