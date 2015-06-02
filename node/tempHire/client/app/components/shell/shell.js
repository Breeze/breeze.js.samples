(function(angular) {
    'use strict';

    angular.module('viewmodel.shell', [])
        .controller('ShellController', ['$location', '$router', 'errorhandler', 'entitymanagerprovider', 'modelBuilder', controller]);

    function controller($location, $router, errorhandler, entitymanagerprovider, modelBuilder) {
        entitymanagerprovider.modelBuilder = modelBuilder.extendMetadata;

        this.$location = $location;
        this.$router = $router;
        this.entitymanagerprovider = entitymanagerprovider;

        this.navigations = [];

        this.isActiveRoute = function(href) {
            return '/#' + this.$location.path() === href;
        }

        errorhandler.includeIn(this);
    }

    controller.prototype.activate = activate;

    function activate() {
        var self = this;
        self.entitymanagerprovider
                .prepare()
                .then(bootPrivate)
                .catch(function (e) {
                    if (e.status === 401) {
                        bootPublic();
                    } else {
                        self.handleError(e);
                    }
                });

        function bootPrivate() {
            self.navigations = [
                { href: '/#/home', title: 'Home' },
                { href: '/#/resourcemgt', title: 'Resource Management' }
            ];
            //self.navigations = [
            //    { link: 'home', title: 'Home' },
            //    { link: 'resourcemgt', title: 'Resource Management' }
            //];
            self.$router.config([
               { path: '/home', component: 'home' },
               { path: '/resourcemgt', component: 'resourcemgt' },
               //{ path: '/home', components: { home: 'home' } }
            ]);
            self.$location.path('/home');
        }

        function bootPublic() {
            self.navigations = [];

            self.$router.config([
               { path: '/login', component: 'login' }
            ]);
            self.$location.path('/login');
        }
    }

})(window.angular);