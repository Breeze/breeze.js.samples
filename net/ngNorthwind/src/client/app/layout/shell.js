(function () {
    'use strict';

    angular
        .module('app.layout')
        .controller('Shell', Shell);

    Shell.$inject = ['config', 'dataservice', 'logger'];

    function Shell(config, dataService, logger) {
        /*jshint validthis: true */
        var vm = this;

        vm.title = config.appTitle;
        vm.busyMessage = 'Please wait ...';
        vm.isBusy = true;
        vm.showSplash = true;

        activate();

        function activate() {
            logger.success(config.appTitle + ' loaded!', null);
            dataService.ready().then(hideSplash);
        }

        function hideSplash() {
            vm.showSplash = false;
        }
    }
})();