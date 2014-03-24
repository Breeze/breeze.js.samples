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
                     { name: 'Home',  path: '/welcome',         sref : 'app.welcome',    selected: false }
                    ,{ name: 'Order', path: '/catalog/pizza',   sref : 'app.catalog.products',      selected: false }
                    ,{ name: 'About', path: '/about',           sref : 'app.about',      selected: false }
                    ,{                path: '/order/cart',      sref : 'app.cart', selected: false }
                ],

                // Routes within the order SIDEBAR view that lead to order content view changes

                sidebar : [
                     { path: '/catalog/pizza'   ,name: 'Pizza'  ,tag : 'pizza' }
                    ,{ path: '/catalog/salad'   ,name: 'Salad'  ,tag : 'salad' }
                    ,{ path: '/catalog/drink'   ,name: 'Drinks' ,tag : 'drink' }
                ],

                /**
                 * Easy lookup of product database `tag` based on `category` type
                 */
                findProductTagBy : function( category )
                {
                    var list = map.sidebar;
                    for (var j=0; j< list.length; j++ )
                    {
                        if ( list[j].tag.toLowerCase() === category.toLowerCase() )
                        {
                            return list[j].tag;
                        }
                    }
                    // Return `pizza` as the default product listing
                    return 'pizza';
                }
            }
        };


}( this.angular ));
