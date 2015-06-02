(function(angular) {
    'use strict';

    var model = angular.module('model', []);
    model.factory('modelBuilder', [factory]);

    function factory() {
        var self = {
            extendMetadata: extendMetadata
        };

        return self;

        function extendMetadata(metadataStore) {
            extendStaffingResource(metadataStore);
            extendAddress(metadataStore);
            extendPhoneNumber(metadataStore);
        }

        function extendStaffingResource(metadataStore) {
            var staffingResourceCtor = function () {
                this.id = breeze.core.getUuid();
            };

            staffingResourceCtor.prototype.addAddress = function (typeId) {
                return this.entityAspect.entityManager.createEntity('Address', { addressTypeId: typeId, staffingResourceId: this.id });
            };

            staffingResourceCtor.prototype.addPhoneNumber = function (typeId) {
                return this.entityAspect.entityManager.createEntity('PhoneNumber', { phoneNumberTypeId: typeId, staffingResourceId: this.id });
            };

            staffingResourceCtor.prototype.deletePhoneNumber = function (phoneNumber) {
                ensureEntityType(phoneNumber, 'PhoneNumber');
                this.throwIfNotOwnerOf(phoneNumber);

                phoneNumber.entityAspect.setDeleted();
            };

            staffingResourceCtor.prototype.setPrimaryPhoneNumber = function (phoneNumber) {
                ensureEntityType(phoneNumber, 'PhoneNumber');
                this.throwIfNotOwnerOf(phoneNumber);

                this.phoneNumbers.forEach(function (x) {
                    x.primary = false;
                });

                phoneNumber.primary = true;
            };

            staffingResourceCtor.prototype.deleteAddress = function (address) {
                ensureEntityType(address, 'Address');
                this.throwIfNotOwnerOf(address);

                address.entityAspect.setDeleted();
            };

            staffingResourceCtor.prototype.setPrimaryAddress = function (address) {
                ensureEntityType(address, 'Address');
                this.throwIfNotOwnerOf(address);

                this.addresses.forEach(function (x) {
                    x.primary = false;
                });

                address.primary = true;
            };

            staffingResourceCtor.prototype.throwIfNotOwnerOf = function (obj) {
                if (!obj.staffingResourceId || obj.staffingResourceId !== this.id) {
                    throw new Error('Object is not associated with current StaffingResource');
                }
            };

            var staffingResourceInitializer = function (staffingResource) {
                Object.defineProperty(staffingResourceCtor.prototype, 'fullName', {
                    enumerable: true,
                    configurable: true,
                    get: function() {
                        if (this.middleName) {
                            return this.firstName + ' ' + this.middleName + ' ' + this.lastName;
                        }
                        return this.firstName + ' ' + this.lastName;

                    }
                });
            };

            metadataStore.registerEntityTypeCtor('StaffingResource', staffingResourceCtor, staffingResourceInitializer);
        }

        function extendAddress(metadataStore) {
            var addressCtor = function () {
                this.id = breeze.core.getUuid();
            };

            metadataStore.registerEntityTypeCtor('Address', addressCtor);
        }

        function extendPhoneNumber(metadataStore) {
            var phoneNumberCtor = function () {
                this.id = breeze.core.getUuid();
            };

            metadataStore.registerEntityTypeCtor('PhoneNumber', phoneNumberCtor);
        }

        function ensureEntityType(obj, entityTypeName) {
            if (!obj.entityType || obj.entityType.shortName !== entityTypeName) {
                throw new Error('Object must be an entity of type ' + entityTypeName);
            }
        }
    }

})(window.angular);