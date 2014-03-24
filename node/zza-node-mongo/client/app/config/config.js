(function(angular) {
    'use strict';

    angular.module( "app" )
           .factory( 'config', factory );

        // **************************************
        // Private construction function
        // **************************************

        function factory( ) {
            return {
                version             : '0.5.0',
                server              : 'Express',
                serviceName         : 'breeze/zza',
                devServiceName      : 'breeze/Dev',
                productImageBasePath: 'app/images/products/',
                productUnknownImage : 'app/images/products/unknown.jpg',
                userSessionId       : '0', //breeze.core.getUuid(),
                serverTimeoutMs     : 5000 // 5 seconds should be long enough
            };
        };


}( this.angular ));
