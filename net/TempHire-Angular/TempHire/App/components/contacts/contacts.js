(function(angular) {
    'use strict';

    var moduleId = 'viewmodel.contacts';

    angular.module(moduleId, [])
        .controller('ContactsController', ['$q', '$routeParams', '$modal', 'breeze', 'unitofwork', 'logger', 'errorhandler', controller]);

    function controller($q, $routeParams, $modal, breeze, unitOfWorkManager, logger, errorhandler) {
        this.moduleId = moduleId;

        this.$q = $q;
        this.$modal = $modal;
        this.breeze = breeze;
        this.staffingResourceId = $routeParams.id;
        this.staffingResource = null;
        this.states = [];

        this.unitOfWorkManager = unitOfWorkManager;
        var ref = unitOfWorkManager.get($routeParams.id);
        this.unitOfWork = ref.value();

        errorhandler.includeIn(this);
    }

    controller.prototype.activate = activate;
    controller.prototype.addPhoneNumber = addPhoneNumber;
    controller.prototype.setPrimaryPhoneNumber = setPrimaryPhoneNumber;
    controller.prototype.deletePhoneNumber = deletePhoneNumber;
    controller.prototype.addAddress = addAddress;
    controller.prototype.setPrimaryAddress = setPrimaryAddress;
    controller.prototype.deleteAddress = deleteAddress;

    function activate() {
        var self = this;

        var root = this.unitOfWork.staffingResources.withId(this.staffingResourceId)
            .then(function(data) {
                self.staffingResource = data;
            });

        // Load states
        var states = this.unitOfWork.states.all()
            .then(function(data) {
                self.states = data;
            });

        // Load addresses
        var predicate = this.breeze.Predicate.create("staffingResourceId", "==", this.staffingResourceId);
        var addresses = this.unitOfWork.addresses.find(predicate);

        // Load phone numbers
        var phoneNumbers = this.unitOfWork.phoneNumbers.find(predicate);

        this.$q.all([root, states, addresses, phoneNumbers]).catch(self.handleError);
    }

    function addPhoneNumber() {
        var self = this;
        self.unitOfWork.phoneNumberTypes.all()
            .then(function (data) {
                var modalInstance = self.$modal.open({
                    templateUrl: '/App/components/contacts/optionselector.html',
                    controller: 'OptionSelectorController',
                    controllerAs: 'optionselector',
                    resolve: {
                        args: function () {
                            return {
                                label: 'Select phone type: ',
                                options: data,
                                optionsText: 'name',
                                optionsValue: 'id'
                            };
                        }
                    }
                });

                modalInstance.result.then(function (response) {
                    self.staffingResource.addPhoneNumber(response.selectedValue);
                });
            })
            .catch(self.handleError);
    }

    function setPrimaryPhoneNumber(phoneNumber) {
        if (phoneNumber.primary) return;

        this.staffingResource.setPrimaryPhoneNumber(phoneNumber);
    };

    function deletePhoneNumber(phoneNumber) {
        if (phoneNumber.primary || this.staffingResource.phoneNumbers.length === 1) return;

        this.staffingResource.deletePhoneNumber(phoneNumber);
    };

    function addAddress() {
        var self = this;
        self.unitOfWork.addressTypes.all()
            .then(function (data) {
                var modalInstance = self.$modal.open({
                    templateUrl: '/App/components/contacts/optionselector.html',
                    controller: 'OptionSelectorController',
                    controllerAs: 'optionselector',
                    resolve: {
                        args: function () {
                            return {
                                label: 'Select address type: ',
                                options: data,
                                optionsText: 'displayName',
                                optionsValue: 'id'
                            };
                        }
                    }
                });

                modalInstance.result.then(function (response) {
                    self.staffingResource.addAddress(response.selectedValue);
                });
            })
            .catch(self.handleError);
    }

    function deleteAddress(address) {
        if (address.primary || this.staffingResource.addresses.length === 1) return;

        this.staffingResource.deleteAddress(address);
    };

    function setPrimaryAddress(address) {
        if (address.primary) return;

        this.staffingResource.setPrimaryAddress(address);
    };

})(window.angular);