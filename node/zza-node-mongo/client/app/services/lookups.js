/*
 * A data service with easy access to "lookup" reference entities
 * which it can fetch from the server.
 * "Lookups" are relatively-stable reference entities
 * typically presented as choices for property values of primary entities.
 *
 * Exs: Products, ProductOptions, ProductSizes
 */
(function(angular) {
    'use strict';

    angular.module( "app" ).factory( 'lookups',
        ['breeze', 'util', factory]);

    function factory( breeze, util ) {

        var lookups = {
            fetchLookups: fetchLookups,
            initialize: initialize
        };
        return lookups;
        /////////////////////
        function fetchLookups(manager) {
            return breeze.EntityQuery.from('Lookups')
                .using(manager).execute()
                .then(function () {
                     util.logger.info("Lookups loaded from server.");
                     manager.hasLookups = true;
                     initialize(manager)
                });
        }

        // initialize this lookups service from lookup data presumed to be in cache
        function initialize(manager) {

            lookups.OrderStatus = {
                statuses : manager.getEntities('OrderStatus')
            };
            lookups.products        = manager.getEntities('Product');
            lookups.productOptions  = manager.getEntities('ProductOption');
            lookups.productSizes    = manager.getEntities('ProductSize');
            extendLookups();
        }

        function extendLookups() {
            var u = util, s = lookups, os = s.OrderStatus; // for brevity

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
    }


}( this.angular ));
