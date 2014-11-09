(function () {
    'use strict';

    var core = angular.module('app.core');

    var config = {
        appErrorPrefix: '[bzNorthwind Error] ', 
        appTitle: 'Breeze Angular Northwind',
        useBreeze: true,
        version: '0.0.0'
    };

    core.value('config', config);




    /// Configure the $log, router and toastr ////
    core.config(setup);

    /* @ngInject */
    function setup ($logProvider, $routeProvider, exceptionConfigProvider, routehelperConfigProvider, toastr) {
        // turn debugging off/on (no info or warn)
        if ($logProvider.debugEnabled) {
            $logProvider.debugEnabled(true);
        }

        // Configure toastr
        toastr.options.timeOut = 4000;
        toastr.options.positionClass = 'toast-bottom-right';

        // Configure the common route provider
        routehelperConfigProvider.config.$routeProvider = $routeProvider;
        routehelperConfigProvider.config.docTitle = 'Breeze Northwind: ';

        // Configure the common exception handler
        exceptionConfigProvider.config.appErrorPrefix = config.appErrorPrefix;
    }

})();