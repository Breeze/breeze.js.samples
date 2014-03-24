(function(angular) {
    'use strict';

   angular.module( "app" )
          .controller( 'catalog', controllerFn );

    // **************************************
    // Annotated construction function
    // **************************************

    function controllerFn( $stateParams, routes, dataservice )
    {
        var vm  = this;
        var tag = routes.findProductTagBy( $stateParams.category );

        // When the Breeze dataservices have initialized and are ready...
        // then get the product listing

        dataservice.ready( getProductsByTag( tag ) );


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
