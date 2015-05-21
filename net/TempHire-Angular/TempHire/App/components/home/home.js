(function(angular) {
    'use strict';

    angular.module('viewmodel.home', []).controller('HomeController', ['logger', controller]);

    function controller(logger) {
        this.logger = logger;
        this.title = 'Home View';
    }

    controller.prototype.activate = function() {
        this.logger.log('Home View Activated', null, 'home', true);
    }

})(window.angular);