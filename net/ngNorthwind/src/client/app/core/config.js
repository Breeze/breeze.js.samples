(function () {
    'use strict';

    var core = angular.module('app.core');

    var config = {

        // Pick ONE. See README.md
        apiHost: //'http://sampleservice.breezejs.com/api/',
                'http://localhost:58066/breeze/',

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
        var rConfig = routehelperConfigProvider.config;
        rConfig.$routeProvider = $routeProvider;
        rConfig.docTitle = 'Breeze Northwind: ';
        rConfig.resolveAlways = { productDataservice: ready };

        // Configure the common exception handler
        exceptionConfigProvider.config.appErrorPrefix = config.appErrorPrefix;
    }

    // For simplicity, all routes require that the productDataservice be ready.
    function ready(dataservice) {
        return dataservice.ready();
    }
    ready.$inject = ['productDataservice'];

})();