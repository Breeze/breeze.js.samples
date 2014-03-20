(function(angular) {
    'use strict';

    angular.module( "app" )
           .controller( 'orderSidebarController', orderSidebarController );

        // **************************************
        // Private construction function
        // **************************************

        function orderSidebarController( $scope, dataservice )
        {
            var vm = $scope.vm = this;

            // Routes within the order view that lead to product list views
            var orderProductRoutes = [
                { path: '/order/pizza', name: 'Pizza',  sref : 'order.pizza'   },
                { path: '/order/salad', name: 'Salad',  sref : 'order.salad'   },
                { path: '/order/drink', name: 'Drinks', sref : 'order.drink'   }
            ];


            vm.productLinks = orderProductRoutes;
            vm.cartOrder    = dataservice.cartOrder;
            vm.draftOrder   = dataservice.draftOrder;
        };



}( this.angular ));

