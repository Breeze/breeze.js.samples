(function(angular) {
    'use strict';

   angular.module( "app" )
        .controller( 'orderController', controllerFn );


        // **************************************
        // Annotated construction function
        // **************************************

        function controllerFn( $scope )
        {
            var vm = $scope.vm = this;

                // Build state model available to current
                // controller and all children

                vm.active = {
                    product : ""
                }

        };


}( this.angular ));
