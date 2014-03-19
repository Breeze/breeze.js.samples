/**
 *
 *  This DashboardController module uses RequireJS to `define` a AngularJS constructor function
 *  with its dependencies.
 *
 */
(function( define ) {
    "use strict";

    define( [ ], function( ) {

        function DashboardController( routes, dataservice )
        {
            var vm = this;

                vm.productLinks = routes.orderProductRoutes;
                vm.cartOrder    = dataservice.cartOrder;
                vm.draftOrder   = dataservice.draftOrder;
        };

        // Register as global constructor function
        return [ 'routes', 'dataservice', DashboardController ];

    });

}( this.define ));

