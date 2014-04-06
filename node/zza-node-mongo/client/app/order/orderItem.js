/*
 * orderItem viewmodel associated with orderItem.html view
 * and its orderItem**.html sub-views.
 */
(function(angular) {
    'use strict';

    angular.module( "app" ).controller( 'orderItem',
        ['$state', '$stateParams', 'dataservice', 'OptionTypeVm', 'util', controller] );

    function controller($state, $stateParams, dataservice, OptionTypeVm, util ) {
        var vm = this;
        dataservice.ready(onReady);

        function onReady() {
            var cartOrder    = dataservice.cartOrder;
            var draftOrder   = dataservice.draftOrder;
            var info         = getOrderItemInfo( );
            var isDraftOrder = false;

            if ( info ) {
                isDraftOrder    = info.orderItem.order === dataservice.draftOrder;
                vm.addToCart    = addToCart;
                vm.isDraftOrder = isDraftOrder;
                vm.orderItem    = info.orderItem;
                vm.product      = info.product;
                vm.sizeVms      = createSizeVms(info);
                vm.typeVms      = createOptionTypeVms(info);

            } else {
                showMenu();
            }
        /////////////////////
            function addToCart() {
                if (isDraftOrder) {
                    draftOrder.removeItem(vm.orderItem);
                    cartOrder.addItem(vm.orderItem);
                    util.logger.info("Added item to cart");

                    showMenu();
                }
            }

            // Get the OrderItem information base on $stateParams
            function getOrderItemInfo( ) {
                var fromOrder   = $stateParams.orderItemId != null;
                return fromOrder ? getInfoFromOrder() : getInfoByProduct()

                // Get the order item info from the order and orderItem id.
                function getInfoFromOrder( ) {
                    var info = null
                      , orderId = $stateParams.orderId
                      , orderItemIid = +$stateParams.orderItemId;

                    // Todo: in future, could be the orderId of any order
                    var orderItem = orderId == 'cart' ?
                        cartOrder.getSelectedItem(orderItemIid) :
                        draftOrder.getSelectedItem(orderItemIid);

                    if (orderItem){
                        info = {
                            orderItem: orderItem,
                            product: orderItem.product,
                            sizes: dataservice.productSizes.byProduct(orderItem.product)
                        }
                    }
                    return info;
                }

                // Get the order item info from the productId.
                function getInfoByProduct() {
                    var prodId = +$stateParams.productId
                    var product = dataservice.products.byId(prodId);
                    if (!product){ return null; }

                    var sizes = dataservice.productSizes.byProduct(product);

                    // Find an orderItem on the draft order for the given product.
                    var orderItem =  draftOrder.orderItems.filter(function (oi) {
                            return oi.productId == prodId;
                        })[0];

                    if (!orderItem) {
                        // No existing orderItem for this product
                        // Create a new orderItem
                        orderItem = draftOrder.addNewItem(product);
                        orderItem.productSize = sizes[0]; // defaultSize
                    }

                    return {
                        orderItem: orderItem,
                        product: product,
                        sizes: sizes
                    };
                }
            }

        }

        // Create an OptionTypeVm for each distinct type of productOption.
        // See optionTypeVm.js
        // Each OptionTypeVm will be displayed in its own tab
        // Each OptionTypeVm contains the OptionVms for one type of productOption (e.g., spice)
        function createOptionTypeVms(info) {
            // group the productOptions by type
            var optionVms = createOptionVms(info);
            var typeGrps = util.groupArray( optionVms,
                function (ovm) { return ovm.productOption.type; }, 'type', 'options');
            var typeVms = typeGrps.map(function (tg) {return new OptionTypeVm(info.orderItem, tg)});
            return typeVms;
        }

        // A VM for each productOption for the given product
        // The VM has an itemOption if the current OrderItem has an ItemOption for that product
        function createOptionVms(info) {
            var productOptions = dataservice.productOptions.byProduct(info.product);

            var itemOptions =
                util.keyArray(info.orderItem.orderItemOptions, function (o) { return o.productOptionId; });

            return productOptions.map(function (po) {
                var io = itemOptions[po.id];
                return {
                    id: po.id,
                    name: po.name,
                    productOption: po,
                    selected: !!io,
                    itemOption: io
                };
            });
        }

        function createSizeVms(info) {
            var isPremium = info.product.isPremium;
            return info.sizes.map(function (size) {
                return {
                    id: size.id,
                    name: size.name,
                    price: isPremium ? (size.premiumPrice ||size.price) : size.price
                };
            });
        }

        function showMenu(){
            $state.go('app.menu', {productType : $stateParams.productType});
        }
   }

}( this.angular ));
