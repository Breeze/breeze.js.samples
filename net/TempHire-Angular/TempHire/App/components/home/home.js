(function(angular) {
    'use strict';

    var moduleId = 'viewmodel.home';

    angular.module(moduleId, []).controller('HomeController', ['logger', controller]);

    function controller(logger) {
        this.moduleId = moduleId;
        this.logger = logger;
        this.title = 'Home View';
    }

    controller.prototype.activate = function() {
        this.logger.log('Home View Activated', null, 'home', true);
    }

})(window.angular);