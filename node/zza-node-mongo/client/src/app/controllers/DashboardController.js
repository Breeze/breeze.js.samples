(function(angular) {
    'use strict';

    angular.module( "app" )
           .controller( 'dashboardController', dashboardController );

        // **************************************
        // Private construction function
        // **************************************

        function dashboardController( routes, dataservice )
        {
            var vm = this;

                vm.productLinks = routes.orderProductRoutes;
                vm.cartOrder    = dataservice.cartOrder;
                vm.draftOrder   = dataservice.draftOrder;
        };



}( this.angular ));

