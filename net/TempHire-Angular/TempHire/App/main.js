(function(angular) {
    'use strict';

    var mainApp = angular.module('main', ['ngNewRouter', 'ui.bootstrap', 'breeze.angular', 'model', 'services', 'viewmodel.shell', 'viewmodel.login', 'viewmodel.home', 'viewmodel.resourcemgt', 'viewmodel.details', 'viewmodel.contacts']);

    mainApp.config(['$componentLoaderProvider', config]);

    function config($componentLoaderProvider) {
        //configure the default template mapping function to look under 'App' folder for template urls
        var origFn = $componentLoaderProvider.$get().template;
        $componentLoaderProvider.setTemplateMapping(function (name) {
            return 'App/' + origFn(name);
        });
    }

    mainApp.controller('MainController', ['$router', controller]);

    function controller($router) {

        $router.config([
            //{ path: '/', redirectTo: '/main' },
            { path: '/', component: 'shell' },
            //{ path: '/shell', component: 'shell' },
            //{ path: '/shell', components: { shellComp: 'shell' } },
            //{ path: '/home', components: { homeComponent: 'home' } }
            //{ path: '/home', component: 'home' },
            //{ path: '/resourcemgt', component: 'resourcemgt' }
        ]);
    }

    

})(window.angular);