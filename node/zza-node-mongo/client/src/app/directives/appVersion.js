(function( define ) {
    "use strict";

    define( [  ], function( ) {

        function appVersion ( config )
        {
            return function(scope, elm) {
                elm.text(config.version);
            };
        };

        // Register as global constructor function
        return [ 'config', appVersion ];
    });

}( this.define ));
