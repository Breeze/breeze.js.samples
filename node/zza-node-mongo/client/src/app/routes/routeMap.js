(function( angular ) {
    "use strict";

    angular.module( "app" )
           .value( "routes", buildRouteMap() );

        // **************************************
        // Private construction function
        // **************************************

        function buildRouteMap( )
        {
            // Declare all the routes.
            // @see routeState.js

            return {

                // Routes within the header view which direct content that should be displayed

                header : [
                     { name: 'Home',  path: '/welcome',  sref : 'app.welcome',  selected: false }
                    ,{ name: 'About', path: '/about',    sref : 'app.about',    selected: false }
                    ,{ name: 'Order', path: '/order',    sref : 'app.order',    selected: false }
                    ,{                path: '/cart',     sref : 'app.cart',     selected: false }
                ],

                // Routes within the order sidebar view that lead to order content view changes

                sidebar : [
                     { path: '/order/pizza', name: 'Pizza'   }
                    ,{ path: '/order/salad', name: 'Salad'   }
                    ,{ path: '/order/drink', name: 'Drinks'  }
                ]
            }
        };


}( this.angular ));
