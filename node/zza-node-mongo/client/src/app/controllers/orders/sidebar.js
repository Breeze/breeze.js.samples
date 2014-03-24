(function(angular) {
    'use strict';

    angular.module( "app" )
           .controller( 'sidebar', controllerFn );

        // **************************************
        // Annotated construction function
        // **************************************

        function controllerFn( $scope, routes, dataservice )
        {
            var vm = this;

            dataservice.ready( function()
            {
                $scope.$watch( hasChangedCartOrHistory ,updateCartAndHistory );

                vm.products     = routes.sidebar.map( deselectItem );
                vm.cartOrder    = dataservice.cartOrder;
                vm.draftOrder   = dataservice.draftOrder;

                vm.selectItem   = selectItem;

            });

            hasChangedCartOrHistory();

            // *****************************************************
            // Manage views of Cart or Recent Activity areas...
            // *****************************************************


            /**
             * Build a hashKey representing the cart and history items...
             * This value is cached by AngularJS and used to trigger subsequent
             * calls to updateCartAndHistory()
             *
             * @returns {string}
             */
            function hasChangedCartOrHistory()
            {
                var cart    = vm.cartOrder,
                    history = vm.draftOrder;

                return  ( cart && history )                         ?
                        cart.orderItems + ',' + history.orderItems  : false;
            }

            /**
             * One or both of the Cart/History lists has changed, so update
             * the visibility flag on both
             */
            function updateCartAndHistory()
            {
                var cart    = vm.cartOrder,
                    history = vm.draftOrder;

                vm.hideCart    = cart    ? (cart.orderItems < 1)    : true;
                vm.hideHistory = history ? (history.orderItems < 1) : true;
            }

            // **************************************
            // Private Methods
            // **************************************

            /**
             *  deselect the item
             * @param item
             * @returns {*}
             */
            function deselectItem( item )
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
                vm.products.forEach( function(item){
                    item.selected = ( item === selectedItem );
                })
            }
        };

}( this.angular ));

