(function(angular) {
    'use strict';

    angular.module( "app" )
        .constant( 'environment', environment() );

        // **************************************
        // Private construction function
        // **************************************

        function environment( )
        {
            return {
                server          : 'Express',
                serviceName     : 'breeze/zza',
                devServiceName  : 'breeze/Dev'
            };
        };


}( this.angular ));
