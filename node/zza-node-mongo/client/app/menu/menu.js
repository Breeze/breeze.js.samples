(function(angular) {
    'use strict';

    angular.module( "app" ).controller( 'menu', controller );

    function controller($state, $stateParams, dataservice ) {
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
            vm.go = go;
            vm.template = 'app/menu/menu.' + type + '.html';
        }

        // An ng-click callback that uses $state to navigate
        // the link url is not visible in the browser and must
        // style the anchor tag with 'hand' for the cursor to indicate a clickable.
        // See pizza.html for an example of this approach
        function go(product) {
            $state.go('app.order.product', {productType : product.type, productId: product.id});
        }

        // Generates a link that you can see in the browser
        // See drink.html for an example of this approach
        function productSref(p) {
            return "app.order.product({productType: '" + p.type + "', productId: '" + p.id +"'})";
            //return '#/menu/'+p.type+'/'+p.id;
        }
    }

}( this.angular ));