(function(angular) {
    'use strict';

    angular.module( "app" )
           .controller( 'orderSidebar', orderSidebar );

        // **************************************
        // Annotated construction function
        // **************************************

        function orderSidebar( routes, dataservice )
        {
            var vm = this;

            dataservice.ready( function()
            {
                vm.products     = routes.sidebar.map( deselect );
                vm.cartOrder    = dataservice.cartOrder;
                vm.draftOrder   = dataservice.draftOrder;

                vm.selectItem   = selectItem;
            });
        };


        // **************************************
        // Private Methods
        // **************************************

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

