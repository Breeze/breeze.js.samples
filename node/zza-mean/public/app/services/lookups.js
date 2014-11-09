/*
 * Lookups - a data service with easy access to "lookup" reference entities
 * which it can fetch from the server.
 * "Lookups" are relatively-stable reference entities
 * typically presented as choices for property values of primary entities.
 *
 * Exs: Products, ProductOptions, ProductSizes
 *
 * The service relies on the apps 'master manager' for its entities
 */
(function(angular) {
    'use strict';

    angular.module( "app" ).factory( 'lookups',
        ['breeze', 'entityManagerFactory', 'util', factory]);

    function factory( breeze, emFactory, util ) {
        var isReady  = null,// becomes a promise, not a boolean
            logger   = util.logger,
            manager  = emFactory.getManager(); // get the master manager

        var lookups = {
            ready: ready
            // extended during initialization
        };
        return lookups;
        /////////////////////
        // extend this lookups service with lookup accessors from data presumed to be in cache
        function extendlookups() {
            // convenience variables
            var lu = lookups,
                u = util;

            var statuses = manager.getEntities('OrderStatus');
            var os       = lu.OrderStatus = {statuses: statuses};
            os.byId      = u.filterById(statuses);
            os.byName    = u.filterByName(statuses);

            // OrderStatus enums
            os.Ordered   = os.byName(/Ordered/i)[0];
            os.PickedUp  = os.byName(/PickedUp/i)[0];
            os.Delivered = os.byName(/Delivered/i)[0];
            os.Cancelled = os.byName(/Cancelled/i)[0];
            os.Pending   = os.byName(/Pending/i)[0];

            var p        = lu.products = manager.getEntities('Product');
            p.byId       = u.filterById(p);
            p.byName     = u.filterByName(p);
            p.byTag      = filterProductsByTag(p);

            var po       = lu.productOptions = manager.getEntities('ProductOption');
            po.byId      = u.filterById(po);
            po.byTag     = filterOptionsByTag(po);
            po.byProduct = filterOptionsByProduct(po);

            var ps       = lu.productSizes = manager.getEntities('ProductSize');
            ps.byId      = u.filterById(ps);
            ps.byProduct = filterSizesByProduct(ps);
        }

        function ready(success, fail) {
            if (!isReady){ isReady = initialize();}
            if (success) { isReady = isReady.then(success);}
            if (fail)    { isReady = isReady.catch(fail);}
            return isReady;
        }

        function initialize(){
            if (hasLookups(manager)){
                extendlookups(manager);
                return util.resolved;
            } else {
                return fetchLookups();
            }
        }

        function fetchLookups() {
            return breeze.EntityQuery.from('Lookups')
                .using(manager).execute()
                .then(function () {
                    logger.info("Lookups loaded from server.");
                    extendlookups(manager);
                })
                .catch(function (error) {
                    error = util.filterHttpError(error);
                    logger.error(error.message, "lookups initialization failed");
                    throw error; // so downstream fail handlers hear it too
                });
        }

        // Check if the lookup entities have already been loaded
        function hasLookups(){
           // assume has lookup entities if there are OrderStatuses
           return manager.getEntities('OrderStatus').length > 0;
        }

        ///////////////////////////////////////////////
        function filterProductsByTag(products) {
            return function (tag) {
                return products.filter(function (p) { return p.type === tag; });
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
    }

}( this.angular ));
