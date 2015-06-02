(function(angular) {
    'use strict';

    angular.module('services')
        .factory('eventaggregator', ['$rootScope', factory]);

    function factory($rootScope) {

        var events = {};

        var service = {
            subscribe: subscribe,
            unsubscribe: unsubscribe,
            publish: publish
        }

        return service;

        function subscribe(eventName, fn) {
            events[eventName] = $rootScope.$on(eventName, fn);
        }

        function publish(eventName, data) {
            $rootScope.$broadcast(eventName, data);
        }

        function unsubscribe(eventName) {
            if (events[eventName]) {
                var unregisterFunc = events[eventName];
                unregisterFunc();
                delete events[eventName];
            }
        }
    }

})(window.angular);