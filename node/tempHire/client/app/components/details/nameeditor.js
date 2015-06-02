(function(angular) {
    'use strict';

    angular.module('viewmodel.details').controller('NameEditorController', ['$modalInstance', 'unitofwork', 'errorhandler', 'id', controller]);

    function controller($modalInstance, unitofwork, errorhandler, id) {
        this.staffingResourceId = id;
        this.firstName = null;
        this.middleName = null;
        this.lastName = null;
        this.$modalInstance = $modalInstance;

        errorhandler.includeIn(this);

        var ref = unitofwork.get(this.staffingResourceId);
        var uow = ref.value();

        var self = this;
        uow.staffingResources.withId(this.staffingResourceId)
            .then(function(data) {
                self.firstName = data.firstName;
                self.middleName = data.middleName;
                self.lastName = data.lastName;
            })
            .catch(self.handleError)
            .finally(function() { ref.release(); });
    }

    controller.prototype.confirm = function () {
        var result = {
            firstName: this.firstName,
            middleName: this.middleName,
            lastName: this.lastName
        };
        this.$modalInstance.close(result);
    }

    controller.prototype.cancel = function () {
        this.$modalInstance.dismiss('cancel');
    }

    controller.prototype.canConfirm = function() {
        return this.firstName !== '' && this.lastName !== '';
    }

})(window.angular);