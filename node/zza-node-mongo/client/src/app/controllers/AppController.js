(function(angular) {
    'use strict';

    angular.module( "app" )
        .controller( "appController", appController );

        // **************************************
        // Private construction function
        // **************************************

        function appController( $scope, logger )
        {
            var vm = $scope.vm =this;
        }

})(this.angular);
