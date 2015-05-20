(function(angular) {
    'use strict';

    var moduleId = 'viewmodel.details';

    angular.module(moduleId, [])
        .controller('DetailsController', ['$q', '$router', '$routeParams', '$modal', 'eventaggregator', 'unitofwork', 'errorhandler', 'messagebox', controller]);

    function controller($q, $router, $routeParams, $modal, eventaggregator, unitOfWorkManager, errorhandler, messagebox) {
        this.moduleId = moduleId;

        this.$q = $q;
        this.$modal = $modal;
        this.staffingResourceId = $routeParams.id;
        this.staffingResource = null;
        this.unitOfWorkManager = unitOfWorkManager;
        var ref = unitOfWorkManager.get(this.staffingResourceId);
        this.unitOfWork = ref.value();
        this.eventaggregator = eventaggregator;
        this.messagebox = messagebox;
        this.canSave = false;

        errorhandler.includeIn(this);
    }

    controller.prototype.activate = activate;
    controller.prototype.deactivate = deactivate;
    controller.prototype.canDeactivate = canDeactivate;
    controller.prototype.editName = editName;
    controller.prototype.save = save;
    controller.prototype.cancel = cancel;

    function editName() {
        var self = this;
        var modalInstance = this.$modal.open({
            templateUrl: '/App/components/details/nameeditor.html',
            controller: 'NameEditorController',
            controllerAs: 'nameeditor',
            resolve: {
                id: function() {
                    return self.staffingResourceId;
                }
            }
        });

        modalInstance.result.then(function(data) {
            self.staffingResource.firstName = data.firstName;
            self.staffingResource.lastName = data.lastName;
            self.staffingResource.middleName = data.middleName;
        });
    }

    function cancel() {
        this.unitOfWork.rollback();
    }

    function save() {
        this.unitOfWork.commit();
    }

    function activate() {
        var self = this;

        this.eventaggregator.subscribe('hasChanges', function() {
            self.canSave = self.unitOfWork.hasChanges();
        });

        this.unitOfWork.staffingResources.withId(this.staffingResourceId)
            .then(function(data) {
                self.staffingResource = data;
            })
            .catch(self.handleError);
    }

    function deactivate() {
        this.eventaggregator.unsubscribe('hasChanges');
        this.unitOfWorkManager.get(this.staffingResourceId).release();
    }

    function canDeactivate() {
        var self = this;
        if (this.unitOfWork.hasChanges()) {
            return this.messagebox.show('Confirm', 'You have pending changes. Would you like to save them?', ['Yes', 'No', 'Cancel'])
                .then(function(response) {
                    if (response === 'Yes') {
                        return self.unitOfWork.commit()
                            .then(function () { return true; })
                            .catch(self.handleError);
                    }
                    else if (response === 'No') {
                        self.unitOfWork.rollback();
                        return true;
                    }
                    
                    return self.$q.reject(false);

                    //this doesn't work. not sure why.
                    //return false;
                });
        }

        return this.$q.when(true);
    }

})(window.angular);