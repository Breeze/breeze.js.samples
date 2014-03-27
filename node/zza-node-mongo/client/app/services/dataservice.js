/*
 * Query and save remote data with the Breeze EntityManager
 * Also exposes certain cached entities for easy ViewModel access
 */
(function(angular) {
    'use strict';

    angular.module( "app" ).factory( 'dataservice',
        ['entityManagerFactory', 'dataservice.lookups', 'model', 'util', factory]);

    function factory( entityManagerFactory, lookups, model, util ) {

        var logger   = util.logger,
            manager,
            $timeout = util.$timeout

        var service = {
                ready       : ready,
                resetManager: resetManager,
                saveChanges : saveChanges
                /* These are added during initialization:
                 cartOrder,
                 draftOrder,
                 isReady,
                 orderStatuses,
                 products,
                 productOptions,
                 productSizes
                 */
            };

        initialize();
        return service;

        /* implementation */

        function initialize() {
            manager = entityManagerFactory.newManager();
            service.isReady = lookups.fetchLookups(service, manager)
                    .then( createDraftAndCartOrders )
                    .catch( function (error) {
                        logger.error(error.message, "Data initialization failed");
                        logger.error("Alert: Is your MongoDB server running ?");
                        throw error; // so downstream fail handlers hear it too
                    });
        }

        function createDraftAndCartOrders() {
            // Don't call until OrderStatus is available (from lookups)
            var orderInit = { orderStatus: service.OrderStatus.Pending};
            service.cartOrder = model.Order.create(manager, orderInit);
            service.draftOrder = model.Order.create(manager, orderInit);
        }

        function ready(success, fail) {
            var promise = service.isReady;
            if (success) {
                promise = promise.then(success);
            }
            if (fail){
                promise = promise.catch(fail);
            }
            return promise
        }

        function saveChanges() {
            return manager.saveChanges()
                         .then(saveSucceeded)
                         .catch(saveFailed);

            function saveSucceeded(saveResult) {
                logger.success("# of entities saved = " + saveResult.entities.length);
                logger.log(saveResult);
            }

            function saveFailed(error) {
                var msg = 'Save failed: ' + util.getSaveErrorMessages(error);
                error.message = msg;

                logger.error(error, msg);
                // DEMO ONLY: discard all pending changes
                // Let them see the error for a second before rejecting changes
                $timeout(function() {
                    manager.rejectChanges();
                }, 1000);
                throw error; // so caller can see it
            }
        }

        // Reset the manager to its base state
        // Clears the manager, re-populates with the lookups
        // Creates a new draftOrder and cartOrder
        function resetManager() {
            manager.clear(); // detaches everything
            attachEntities(service.OrderStatus.statuses);
            attachEntities(service.products);
            attachEntities(service.productOptions);
            attachEntities(service.productSizes);
            createDraftAndCartOrders();

            // Should be in Breeze itself
            function attachEntities(entities ) {
                entities.forEach(function (entity) {
                    manager.attachEntity( entity );
                });
            }
        }

    };


}( this.angular ));
