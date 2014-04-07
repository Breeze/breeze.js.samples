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
            isReady  = null,// becomes a promise, not a boolean
            manager  = entityManagerFactory.getManager(),
            $timeout = util.$timeout;

        var service = {
            cartOrder   : null,
            draftOrder  : null,
            lookups     : lookups,
            ready       : ready,
            resetManager: resetManager,
            saveChanges : saveChanges
        };
        return service;
        /////////////////////
        function ready(success, fail) {
            if (!isReady){ isReady = initialize();}
            if (success) { isReady = isReady.then(success);}
            if (fail)    { isReady = isReady.catch(fail);}
            return isReady
        }

        function initialize() {
            return lookups.ready(createDraftAndCartOrders, function (error) {
                logger.error(error.message, "Data initialization failed");
                logger.error("Alert: Is your MongoDB server running ?");
                throw error; // so downstream fail handlers hear it too
            });
        }

        function createDraftAndCartOrders() {
            // Can't call until OrderStatus is available (from lookups)
            var orderInit = { orderStatus: lookups.OrderStatus.Pending};
            service.cartOrder = model.Order.create(manager, orderInit);
            service.draftOrder = model.Order.create(manager, orderInit);
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
    }

}( this.angular ));
