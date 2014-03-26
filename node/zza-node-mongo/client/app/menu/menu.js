(function(angular) {
    'use strict';

    angular.module( "app" ).controller( 'menu', controller );

    function controller( $stateParams, dataservice ) {
        var vm  = this;
        dataservice.ready(onReady);

        /**
         * Sets vm.products with the products for a given product type
         * Call it after the dataservice is ready with products
         */
        function onReady() {
            var type = $stateParams.productType;
            if (type){
                var types = ['drink', 'pizza', 'salad'];
                type = types[types.indexOf(type.toLowerCase())];
            }
            type = type || 'pizza';

            vm.products = dataservice.products.byTag( type );
            vm.productSref = productSref;
            vm.template = 'app/menu/menu.' + type + '.html';
        }

        function productSref(p) {
            return "app.order.product({productType: '" + p.type + "', productId: '" + p.id +"'})";
            //return '#/menu/'+p.type+'/'+p.id;
        }
    }

}( this.angular ));