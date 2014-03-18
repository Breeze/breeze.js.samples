(function( define ) {
    "use strict";

    define( [ 'app/services/routes' ], function() {

        function RouteController( $scope, $route, routes )
        {
            var vm = this;

            vm.current = $route.current;
            vm.links = routes.visibleNavRoutes; // Show links only for routes that have a display name

            $scope.$on('$routeChangeSuccess', onSuccess_routeChange);

            // *********************************************************
            // Private methods
            // *********************************************************

            function onSuccess_routeChange () {
                vm.current = $route.current;
            }

        };

        // Register as global constructor function
        return [ '$scope', '$route', 'routes', RouteController ];
    });

}( this.define ));
