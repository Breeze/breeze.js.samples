(function( define ) {
    "use strict";

    define( [ ], function() {

            function TestController( $routeParams, dataservice, logger )
            {
                logger.log("TestController created") ;

                var orderId = $routeParams.id;
                var vm = this;

                vm.orderId = orderId || '<no id>';
                vm.products = dataservice.products;
            };

        // Register as global constructor function
        return [ '$routeParams', 'dataservice','logger', TestController ];
    });

}( this.define ));
