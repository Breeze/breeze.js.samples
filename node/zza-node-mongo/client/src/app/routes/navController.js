(function(angular) {
    'use strict';

   angular.module( "app" )
        .controller( 'navController', controllerFn );

        // **************************************
        // Private construction function
        // **************************************

        function controllerFn( $scope, routes )
        {
            var vm = $scope.vm = this;

                vm.home       = routes[ 0 ];
                vm.cart       = routes[ 3 ];
                vm.links      = routes.filter( findHeaderLinks );
                vm.selectItem = selectItem;


            function findHeaderLinks( item )
            {
                return item.name;
            }

            function selectItem( selectedItem )
            {
                vm.links.forEach( function(item){
                    item.selected = ( item === selectedItem );
                })
            }
        };


}( this.angular ));
