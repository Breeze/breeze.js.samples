(function(angular) {
    'use strict';

   angular.module( "app" )
          .controller( 'catalog', controller );

    function controller( $stateParams, routes, dataservice )
    {
        var vm  = this;
        dataservice.ready(getProductsByCategory);

        /**
         * Sets vm.products with the products for a given product category
         * Call it after the dataservice is ready with products
         */
        function getProductsByCategory( )
        {
            var tag = routes.findProductTagBy( $stateParams.category );
            vm.products = dataservice.products.byTag( tag );
        }
    }

}( this.angular ));
