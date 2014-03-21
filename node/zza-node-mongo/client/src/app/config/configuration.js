(function(angular) {
    'use strict';

    angular.module( "app" )
           .factory( 'config', factory );

        // **************************************
        // Private construction function
        // **************************************

        function factory( environment )
        {
            return {
                version             : '0.5.0',
                server              : environment.server,
                serviceName         : environment.serviceName,
                devServiceName      : environment.devServiceName,
                productImageBasePath: 'src/app/images/products/',
                productUnknownImage : 'src/app/images/products/unknown.jpg',
                userSessionId       : '0', //breeze.core.getUuid(),
                serverTimeoutMs     : 5000 // 5 seconds should be long enough
            };
        };


}( this.angular ));
