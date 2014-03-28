/*
 * Extends the dataservice with easy access to "Lookups"
 * which it fetches from the server.
 * "Lookups" are relatively-stable reference entities
 * typically presented as choices for property values of primary entities.
 *
 * Exs: Products, ProductOptions, ProductSizes
 */
(function(angular) {
    'use strict';

    angular.module( "app" ).factory( 'dataservice.lookups',
        ['breeze', 'util', factory]);

    function factory( breeze, util ) {

        return {
            fetchLookups: fetchLookups
        };

        function fetchLookups(service, manager) {

            return breeze.EntityQuery.from('Lookups')
                              .using(manager)
                              .execute()
                              .then(function () {
                                  util.logger.info("Lookups loaded from server.");
                                  setServiceLookups(service, manager)
                              })
        }

        function setServiceLookups(service, manager ) {

            // set service lookups from  lookup data in cache
            service.OrderStatus = {
                statuses : manager.getEntities('OrderStatus')
            };
            service.products        = manager.getEntities('Product');
            service.productOptions  = manager.getEntities('ProductOption');
            service.productSizes    = manager.getEntities('ProductSize');
            extendLookups(service);
        }

        function extendLookups(service) {
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

    };


}( this.angular ));
