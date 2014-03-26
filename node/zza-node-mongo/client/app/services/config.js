(function(angular) {
    'use strict';

    angular.module( "app" )
           .factory( 'config', factory );

    function factory($rootScope ) {
        // Configure toastr for this app
        // 2 second toast timeout
        toastr.options.timeOut       = 2000;
        toastr.options.positionClass = 'toast-bottom-right';

        return {
            version             : $rootScope.version = '0.7.0',
            debug               : true,
            server              : 'Express',
            serviceName         : 'breeze/zza',
            devServiceName      : 'breeze/Dev',
            productImageBasePath: 'app/images/products/',
            productUnknownImage : 'app/images/products/unknown.jpg',
            userSessionId       : '0' //breeze.core.getUuid()
        };
    };

}( this.angular ));
