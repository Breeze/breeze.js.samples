(function(angular) {
    'use strict';

   angular.module( "app" ).controller( 'menu', controller );

    function controller( $stateParams, dataservice ) {
        var vm  = this;
        dataservice.ready(getProductsForType);

        /**
         * Sets vm.products with the products for a given product category
         * Call it after the dataservice is ready with products
         */
        function getProductsForType( )
        {
            var types = ['drink', 'pizza', 'salad' ];
            var type = $stateParams.productType;
            if (type){
                type = types[types.indexOf(type.toLowerCase())];
            }
            type = type || 'pizza';
            var templateBase = 'app/views/menu/';
            vm.products = dataservice.products.byTag( type );
            vm.productLink = productLink;
            vm.template = templateBase + type + '.html';
        }

        function productLink(product){
            return '#/menu/'+product.type+'/'+product.id;
        }
    }

}( this.angular ));