(function(angular) {
    'use strict';

    var mainApp = angular.module('main', ['ngNewRouter', 'ui.bootstrap', 'breeze.angular', 'model', 'services', 'viewmodel.shell', 'viewmodel.login', 'viewmodel.home', 'viewmodel.resourcemgt', 'viewmodel.details', 'viewmodel.contacts']);

    mainApp.config(['$componentLoaderProvider', configureComponentLoader]);

    mainApp.config(['$pipelineProvider', configurePipelineSteps]);

    mainApp.factory('setCtrlModuleId', setCtrlModuleIdFactory);

    mainApp.controller('MainController', ['$router', controller]);

    function setCtrlModuleIdFactory() {
        return function routeStep(instruction) {
            instruction.router.traverseInstruction(instruction, function (instr) {
                var ctrl = instr.controller;
                return ctrl.moduleId = instr.component;
            });
        };
    }

    function configureComponentLoader($componentLoaderProvider) {
        //configure the default template mapping function to look under 'App' folder for template urls
        var origFn = $componentLoaderProvider.$get().template;
        $componentLoaderProvider.setTemplateMapping(function (name) {
            return 'App/' + origFn(name);
        });
    }

    function configurePipelineSteps($pipelineProvider) {
        var steps = $pipelineProvider.steps;
        //Insert after $initControllersStep
        steps.splice(3, 0, 'setCtrlModuleId');
        $pipelineProvider.config(steps);
    }
    
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