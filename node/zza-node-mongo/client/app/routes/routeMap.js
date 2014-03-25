(function( angular ) {
    "use strict";

    angular.module( "app" )
           .value( "routes", buildRouteMap() );

        // **************************************
        // Private construction function
        // **************************************

        function buildRouteMap( )
        {
            var map;

            // Declare all the routes.
            // @see routeState.js

            return map = {

                // Routes within the HEADER view which direct content that should be displayed
                // NOTE: the Order page defaults to showing the Pizza product listings...
                // @see routeStates .when() overrides

                header : [
                     { name: 'Home',  path: '/welcome',         sref : 'app.welcome',       selected: false }
                    ,{ name: 'Order', path: '/menu/pizza',      sref : 'app.menu.products', selected: false }
                    ,{ name: 'About', path: '/about',           sref : 'app.about',         selected: false }
                    ,{                path: '/order/cart',      sref : 'app.cart',          selected: false }
                ]
            }
        };


}( this.angular ));
