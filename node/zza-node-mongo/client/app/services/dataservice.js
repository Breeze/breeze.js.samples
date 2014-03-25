(function(angular) {
    'use strict';

    angular.module( "app" ).factory( 'dataservice', factory );

    function factory( breeze, entityManagerFactory, model, util ) {

        var config   = util.config,
            logger   = util.logger,
            $timeout = util.$timeout,
            $q       = util.$q;

        var EntityQuery = breeze.EntityQuery,
            manager = entityManagerFactory.newManager(),
            service = {
                saveChanges : saveChanges,
                resetManager: resetManager,

                isReady     : initialize(),
                ready       : onReady

                /* These are added during initialization:
                 cartOrder,
                 draftOrder,
                 orderStatuses,
                 products,
                 productOptions,
                 productSizes
                 */
            };

        return service;

        //#region implementation
        function initialize() {

            return fetchLookups()
                        .then(  setServiceLookups )
                        .then(  createDraftAndCartOrders );
        }

        function onReady( resolveHandler, rejectHandler )
        {
            return service.isReady.then( resolveHandler,  rejectHandler );
        }


        function fetchLookups() {

            return EntityQuery.from('Lookups')
                              .using(manager)
                              .execute()
                              .then(function () {
                                  logger.info("Lookups loaded from server.");
                              })
                              .catch( function (error) {
                                  logger.error(error.message, "Data initialization failed");
                                  logger.error("Alert: Is your MongoDB server running ?");
                                  throw error; // so downstream fail handlers hear it too
                              });
        }

        function setServiceLookups( ) {

            // set service lookups from  lookup data in cache
            service.OrderStatus = {
                statuses : manager.getEntities('OrderStatus')
            };
            service.products        = manager.getEntities('Product');
            service.productOptions  = manager.getEntities('ProductOption');
            service.productSizes    = manager.getEntities('ProductSize');
            extendLookups();
        }

        function extendLookups() {
            var u = util, s = service, os = s.OrderStatus; // for brevity

            os.byId = u.filterById(os.statuses);
            os.byName = u.filterByName(os.statuses);

            // OrderStatus enums
            os.Ordered = os.byName(/Ordered/i)[0];
            os.PickedUp = os.byName(/PickedUp/i)[0];
            os.Delivered = os.byName(/Delivered/i)[0];
            os.Cancelled = os.byName(/Cancelled/i)[0];
            os.Pending = os.byName(/Pending/i)[0];

            s.products.byId = u.filterById(s.products);
            s.products.byName = u.filterByName(s.products);
            s.products.byTag = filterProductsByTag(s.products);

            s.productSizes.byId = u.filterById(s.productSizes);
            s.productSizes.byProduct = filterSizesByProduct(s.productSizes);

            s.productOptions.byId = u.filterById(s.productOptions);
            s.productOptions.byTag = filterOptionsByTag(s.productOptions);
            s.productOptions.byProduct = filterOptionsByProduct(s.productOptions);

        }

        function filterProductsByTag(products) {
            return function (tag) {
                return products.filter(function (p) { return p.type === tag; });
            };
        }

        function filterSizesByProduct(productSizes) {
            return function (product) {
                var sizeIds = product.productSizeIds;
                var type = product.type;
                if (sizeIds.length) {
                    return productSizes.filter(function (ps) {
                        return (ps.type == type) && (sizeIds.indexOf(ps.id) >= 0);
                    });
                } else {
                    return productSizes.filter(function (ps) { return ps.type === type; });
                }
            };
        }

        function filterOptionsByTag(productOptions) {
            return function (tag) {
                if (tag == 'pizza') {
                    return productOptions.filter(function (o) { return o.isPizzaOption; });
                } else if (tag == 'salad') {
                    return productOptions.filter(function (o) { return o.isSaladOption; });
                }
                return [];  // drink tag has no options
            };
        }

        function filterOptionsByProduct(productOptions){
            return function (product) {
                var type = product.type;
                if (type == 'pizza') {
                    if (product.hasOptions) {
                        return productOptions.filter(function(o) { return o.isPizzaOption;});
                    } else {
                        // even pizza without options has crust and spice options
                        return productOptions.filter(
                            function (o) { return o.isPizzaOption &&
                                (o.type === "crust" || o.type === "spice");});
                    }
                } else if (type == 'salad') {
                    return productOptions.filter(function(o) { return o.isSaladOption; });
                }
                return [];  // drink tag has no options
            };
        }

        /**
         * Only available after lookups have arrived.
         */
        function createDraftAndCartOrders() {
            var orderInit = { orderStatus: service.OrderStatus.Pending};
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
            attachEntities(service.OrderStatus.statuses);
            attachEntities(service.products);
            attachEntities(service.productOptions);
            attachEntities(service.productSizes);
            createDraftAndCartOrders();
        }

        // Should be in Breeze itself
        function attachEntities(entities ) {
            entities.forEach(function (entity) {
                manager.attachEntity( entity );
            });
        }
        //#endregion

    };


}( this.angular ));
