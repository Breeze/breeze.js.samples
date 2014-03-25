(function(angular) {
    'use strict';

    angular.module( "app" )
        .controller( 'header', controllerFn );

    function controllerFn( routes ) {
        var vm = this;

            vm.home       = routes.header[ 0 ];
            vm.cart       = routes.header[ 3 ];
            vm.links      = routes.header.filter( onlyHeaderLinks );
            vm.selectItem = selectItem;


        // **************************************
        // Private Methods
        // **************************************

        /**
         * Filter to only allow items that should be displayed
         * in the Header view
         */
        function onlyHeaderLinks( item )
        {
            return item.name;
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
    };

}( this.angular ));
