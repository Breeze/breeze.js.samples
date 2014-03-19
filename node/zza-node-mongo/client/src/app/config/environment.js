(function( define ) {
    "use strict";

    define( [ ], function( ) {

        function environment( )
        {
            return {
                server          : 'Express',
                serviceName     : 'breeze/zza',
                devServiceName  : 'breeze/Dev'
            };
        };

        // Register an annotated construction function
        return [ environment ];
    });

}( this.define ));
