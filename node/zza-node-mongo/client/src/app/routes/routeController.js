(function(angular) {
    'use strict';

   angular.module( "app" )
        .controller( 'routeController', routeController );

        // **************************************
        // Private construction function
        // **************************************

        function routeController( $scope, $route, routes)
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


}( this.angular ));
