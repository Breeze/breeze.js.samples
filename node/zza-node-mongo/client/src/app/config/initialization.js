(function( define ) {
    "use strict";

    define( [ ], function( ) {
    
        function initialization( util )
        {
            // configure toastr for this app
            toastr.options.timeOut = 2000; // 2 second toast timeout
            toastr.options.positionClass = 'toast-bottom-right';

            util.logger.log("app module is loaded and running on " + util.config.server);

        };

        // Register an annotated construction function
        return [ 'util', initialization ];
    });

}( this.define ));
