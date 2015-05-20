(function(angular) {
    'use strict';

    var moduleId = 'viewmodel.resourcemgt';

    angular.module(moduleId, [])
        .controller('ResourcemgtController', ['$router', 'errorhandler', 'eventaggregator', 'unitofwork', controller]);

    function controller($router, errorhandler, eventaggregator, unitofwork) {
        this.moduleId = moduleId;

        $router.config([
            {
                path: '/:id',
                components: {
                    details: 'details',
                    contacts: 'contacts'
                }
            }
        ]);

        this.title = 'Resource Management';
        this.eventaggregator = eventaggregator;
        this.uow = unitofwork.create();
        this.staffingResources = [];

        errorhandler.includeIn(this);

    }

    controller.prototype.activate = activate;
    controller.prototype.deactivate = deactivate;

    function activate() {
        var self = this;

        self.eventaggregator.subscribe('saved', function(event, entities) {
            loadList();
        });

        loadList();

        function loadList() {
            return self.uow.staffingResourceListItems.all()
                .then(function (data) {
                    self.staffingResources = data;
                    self.log("StaffingResourceListItems loaded", true);
                });
        }
    }

    function deactivate() {
        this.eventaggregator.unsubscribe('saved');
    }


})(window.angular);