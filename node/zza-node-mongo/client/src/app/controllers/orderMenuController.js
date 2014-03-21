(function(angular) {
    'use strict';

   angular.module( "app" )
          .controller( 'orderMenuController', orderMenuController );

    // **************************************
    // Annotated construction function
    // **************************************

    function orderMenuController( $scope, $stateParams, routes, dataservice )
    {
        var vm  = $scope.vm = this;
        var tag = routes.findProductTagBy( $stateParams.category );

        // When the Breeze dataservices have initialized and are ready...
        // then get the product listing

        dataservice.isReady
                   .then( getProductsByTag( tag, vm ) );


        // *****************************************************************

        /**
         * Build a resolve handler for the ProductListing request
         * @param tag Category of products
         * @returns {Function} Resolve Handler
         */
        function getProductsByTag( tag )
        {
            return function onResult() {
                vm.products = dataservice.products.byTag( tag );
            }
        }
    }

}( this.angular ));
