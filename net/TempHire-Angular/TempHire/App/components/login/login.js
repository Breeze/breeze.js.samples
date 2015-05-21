(function(angular) {
    'use strict';

    angular.module('viewmodel.login', [])
        .controller('LoginController', ['$location', '$q', 'errorhandler', 'account', controller]);

    function controller($location, $q, errorhandler, account) {
        this.$location = $location;
        this.$q = $q;
        this.account = account;
        this.username = 'Admin';
        this.password = 'password';

        errorhandler.includeIn(this);
    }

    controller.prototype.loginUser = loginUser;

    function loginUser() {
        var self = this;

        if (!isValid()) return self.$q.when(false);

        return self.account.loginUser(self.username, self.password)
            .then(function () {
                //$location.path('/');  //this doesn't reactivate the shell
                window.location = '/';
                return true;
            })
            .fail(self.handleError);

        function isValid() {
            return self.username && self.password;
        }
    }

})(window.angular);