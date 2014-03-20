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

            return [
                 { path: '/',         sref : 'app',        name: 'Home',  selected: false }
                ,{ path: '/about',    sref : 'app.about',  name: 'About', selected: false }
                ,{ path: '/order',    sref : 'app.order',  name: 'Order', selected: false }
                ,{ path: '/cart',     sref : 'app.cart',                  selected: false }
            ];
        };


}( this.angular ));
