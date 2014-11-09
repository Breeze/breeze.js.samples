(function () {
    'use strict';

    angular
        .module('app.layout')
        .controller('Shell', Shell);

    Shell.$inject = ['config', 'productDataservice', 'logger'];

    function Shell(config, productDataservice, logger) {
        /*jshint validthis: true */
        var vm = this;

        vm.title = config.appTitle;
        vm.busyMessage = 'Please wait ...';
        vm.isBusy = true;
        vm.showSplash = true;

        activate();

        function activate() {
            logger.success(config.appTitle + ' loaded!', null);
            productDataservice.ready().then(hideSplash);
        }

        function hideSplash() {
            vm.showSplash = false;
        }
    }
})();