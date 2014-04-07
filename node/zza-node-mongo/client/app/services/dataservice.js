/*
 * Query and save remote data with the Breeze EntityManager
 * Also exposes the 'lookups' service which it initializes
 */
(function(angular) {
    'use strict';

    angular.module( "app" ).factory( 'dataservice',
        ['entityManagerFactory', 'lookups', 'model', 'util', factory]);

    function factory( entityManagerFactory, lookups, model, util ) {

        var logger   = util.logger,
            manager,
            $timeout = util.$timeout

        var service = {
                lookups     : lookups,
                ready       : ready,
                resetManager: resetManager,
                saveChanges : saveChanges
                /* These are added during initialization:
                 cartOrder,
                 draftOrder,
                 */
            };
        return service;
        /////////////////////
        function initialize() {
            manager = entityManagerFactory.newManager();
            return service.isReady = lookups.fetchLookups(manager)
                    .then( createDraftAndCartOrders )
                    .catch( function (error) {
                        logger.error(error.message, "Data initialization failed");
                        logger.error("Alert: Is your MongoDB server running ?");
                        throw error; // so downstream fail handlers hear it too
                    });
        }

        function createDraftAndCartOrders() {
            // Don't call until OrderStatus is available (from lookups)
            var orderInit = { orderStatus: lookups.OrderStatus.Pending};
            service.cartOrder = model.Order.create(manager, orderInit);
            service.draftOrder = model.Order.create(manager, orderInit);
        }

        function ready(success, fail) {
            var promise = service.isReady;
            if (!promise){
                promise = initialize();
            }
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
            attachEntities(lookups.OrderStatus.statuses);
            attachEntities(lookups.products);
            attachEntities(lookups.productOptions);
            attachEntities(lookups.productSizes);
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
