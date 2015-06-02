(function(angular) {
    'use strict';

    angular.module('services')
        .factory('account', ['$http', factory]);

    function factory($http) {

        var self = {
            loginUser: loginUser
        };

        return self;

        function loginUser(username, password) {
            var data = {
                username: username,
                password: password
            };

            return $http.post('/breeze/account/login', data).error(handleError);
        }

        function handleError(data, status) {
            var error = JSON.parse(data);
            throw new Error(error);
        }
    };

})(window.angular);
    