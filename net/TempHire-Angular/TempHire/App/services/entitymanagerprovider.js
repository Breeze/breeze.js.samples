﻿(function(angular) {
    'use strict';

    var services = angular.module('services');
    services.factory('entitymanagerprovider', ['breeze', 'eventaggregator', factory]);

    function factory(breeze, eventaggregator) {
        breeze.NamingConvention.camelCase.setAsDefault();
        var serviceName = 'breeze';
        var masterManager = new breeze.EntityManager(serviceName);

        var EntityManagerProvider = (function () {

            var entityManagerProvider = function () {
                var manager;

                this.manager = function () {
                    if (!manager) {
                        manager = masterManager.createEmptyCopy();

                        // Populate with lookup data
                        manager.importEntities(masterManager.exportEntities());

                        // Subscribe to events
                        manager.hasChangesChanged.subscribe(function (args) {
                            eventaggregator.publish('hasChanges');
                        });
                    }

                    return manager;
                };
            };

            return entityManagerProvider;
        })();

        var self = {
            prepare: prepare,
            create: create
        };

        return self;

        function create() {
            return new EntityManagerProvider();
        }

        function prepare() {
            return masterManager.fetchMetadata()
                .then(function () {
                    if (self.modelBuilder) {
                        self.modelBuilder(masterManager.metadataStore);
                    }

                    var query = breeze.EntityQuery
                        .from('resourcemgt/lookups');

                    return masterManager.executeQuery(query);
                });
        }
    }

})(window.angular);