(function( define ) {
    "use strict";

    define( [ ], function() {

        function HomeController( )
        {
            var vm = this;

            vm.name = "home";

        };

        // Register as global constructor function
        return [ HomeController ];
    });

}( this.define ));
