(function(angular) {
    'use strict';

   angular.module( "app" )
        .directive( 'appVersion', appVersion );

        function appVersion ( config )
        {
            return function(scope, elm) {
                elm.text(config.version);
            };
        };


}( this.angular ));
