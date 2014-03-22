(function(angular) {
    'use strict';

   angular.module( "app" )
          .controller( 'orderMenu', orderMenu );

    // **************************************
    // Annotated construction function
    // **************************************

    function orderMenu( $stateParams, routes, dataservice )
    {
        var vm  = this;
        var tag = routes.findProductTagBy( $stateParams.category );

        // When the Breeze dataservices have initialized and are ready...
        // then get the product listing

        dataservice.isReady
                   .then( getProductsByTag( tag ) );


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
