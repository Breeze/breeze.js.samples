(function(angular) {
    'use strict';

    angular.module( "app" )
           .controller( 'orderSidebarController', orderSidebarController );

        // **************************************
        // Annotated construction function
        // **************************************

        function orderSidebarController( $scope, routes, dataservice )
        {
            $scope.products = routes.sidebar.map( deselect );
            dataservice.ready( updateOrders );
        };


        // **************************************
        // Private Methods
        // **************************************

        function updateOrders()
        {
            $scope.cartOrder    = dataservice.cartOrder;
            $scope.draftOrder   = dataservice.draftOrder;
        }

        /**
         *  Inject a `selected` value == false at startup
         * @param item
         * @returns {*}
         */
        function deselect( item )
        {
            item.selected = false;
            return item;
        }

        /**
         * Accessor to clear all link selections and
         * highlight the user-selected item
         */
        function selectItem( selectedItem )
        {
            vm.links.forEach( function(item){
                item.selected = ( item === selectedItem );
            })
        }


}( this.angular ));

