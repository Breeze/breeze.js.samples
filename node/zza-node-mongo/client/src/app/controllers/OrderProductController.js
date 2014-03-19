(function(angular) {
    'use strict';

   angular.module( "app" )
        .controller( 'orderProductController', orderProductController );

            // **************************************
            // Private construction function
            // **************************************

            function orderProductController( $routeParams, routes, dataservice )
            {
                var route = getTaggedRoute();
                var tag   = route.tag;
                var vm    = this;

                vm.activeProduct = tag;
                vm.isItemView    = false;
                vm.products      = dataservice.products.byTag(tag);
                vm.view          = route.templateUrl; // view is used in data-ng-include

                // *********************************************************
                // Private methods
                // *********************************************************

                // get the correct route based on the route product tag
                function getTaggedRoute()
                {
                    var i, len, pizza, item, result;
                    tag = ($routeParams.product || '').toLowerCase();
                    var source = routes.orderProductRoutes;
                    for (i = 0, len = source.length; i < len; i++) {
                        item = source[i];
                        if (item.tag === tag) {
                            result = item;
                            break;
                        } else if (item.tag === 'pizza') {
                            pizza = item; // default route
                        }
                    }
                    if (!result) {
                        if (!pizza) {
                            throw new Error("No matching route and can't default to 'pizza'");
                        }
                        result = pizza;// fall back to default
                    }
                    return result;
                }
            };


}( this.angular ));
