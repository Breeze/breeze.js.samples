﻿define(['services/entitymanagerprovider', 'services/repository', 'durandal/app'],
    function (entityManagerProvider, repository, app) {

        var refs = {};

        var UnitOfWork = (function () {

            var unitofwork = function () {
                var provider = entityManagerProvider.create();

                this.hasChanges = function() {
                    return provider.manager().hasChanges();
                };
                
                this.commit = function () {
                    var saveOptions = new breeze.SaveOptions({ resourceName: 'resourcemgt/SaveChanges' });

                    return provider.manager().saveChanges(null, saveOptions)
                        .then(function(saveResult) {
                            app.trigger('saved', saveResult.entities);
                        });
                };

                this.rollback = function () {
                    provider.manager().rejectChanges();
                };

                this.staffingResourceListItems = repository.create(provider, null, 'resourcemgt/StaffingResourceListItems');
                this.staffingResources = repository.create(provider, 'StaffingResource', 'resourcemgt/StaffingResources');
                this.addresses = repository.create(provider, 'Address', 'resourcemgt/Addresses');
                this.addressTypes = repository.create(provider, 'AddressType', 'resourcemgt/AddressTypes', breeze.FetchStrategy.FromLocalCache);
                this.phoneNumbers = repository.create(provider, 'PhoneNumber', 'resourcemgt/PhoneNumbers');
                this.phoneNumberTypes = repository.create(provider, 'PhoneNumberType', 'resourcemgt/PhoneNumberTypes', breeze.FetchStrategy.FromLocalCache);

                this.states = repository.create(provider, 'State', 'resourcemgt/States', breeze.FetchStrategy.FromLocalCache);
            };

            return unitofwork;
        })();

        var SmartReference = (function () {

            var ctor = function () {
                var value = null;

                this.referenceCount = 0;

                this.value = function() {
                    if (value === null) {
                        value = new UnitOfWork();
                    }

                    this.referenceCount++;
                    return value;
                };

                this.clear = function() {
                    value = null;
                    this.referenceCount = 0;

                    clean();
                };
            };

            ctor.prototype.release = function () {
                this.referenceCount--;
                if (this.referenceCount === 0) {
                    this.clear();
                }
            };

            return ctor;
        })();

        return {
            create: create,
            get : get
        };
        
        function create() {
            return new UnitOfWork();
        }
        
        function get(key) {
            if (!refs[key]) {
                refs[key] = new SmartReference();
            }

            return refs[key];
        }
        
        function clean() {
            for (key in refs) {
                if (refs[key].referenceCount == 0) {
                    delete refs[key];
                }
            }
        }
    });