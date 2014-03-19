(function( define ) {
    "use strict";

    define( [ ], function( ) {

        function config( environment )
        {
            return {
                version             : '0.5.0',
                server              : environment.server,
                serviceName         : environment.serviceName,
                devServiceName      : environment.devServiceName,
                productImageBasePath: 'app/images/products/',
                productUnknownImage : 'app/images/products/unknown.jpg',
                userSessionId       : breeze.core.getUuid(),
                serverTimeoutMs     : 5000 // 5 seconds should be long enough
            };
        };

        // Register an annotated construction function
        return [ 'environment', config ];
    });

}( this.define ));
