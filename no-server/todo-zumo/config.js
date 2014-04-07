/*
 * configuration values for the application
 */
(function (){
    'use strict';
    angular.module('app').value('config',config());

    function config(){
        return {
            // Ward's Todo Mobile Service
            appUrl: 'https://wardtodomobileservice.azure-mobile.net/',
            appKey: 'psChxvAmcXMcsgEhqqjmfTkoxzwuWG62'  //this is never a secret.
        };
    }

})();

