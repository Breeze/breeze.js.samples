(function(angular) {
    'use strict';

   angular.module( "app" )
        .controller( 'orderItem', orderItem );

            // **************************************
            // Private construction function
            // **************************************

            function orderItem( $stateParams, dataservice, util )
            {
                var vm         = this;

                var cartOrder  = null;
                var draftOrder = null;
                var info       = null;
                var orderItem  = null;
                var isDraft    = true;

                dataservice.ready( function presentOrderItem() {

                    cartOrder  = dataservice.cartOrder;
                    draftOrder = dataservice.draftOrder;
                    info       = getOrderItemInfo( $stateParams );
                    orderItem  = info.orderItem;
                    isDraft    = orderItem ? orderItem.order === dataservice.draftOrder : false;

                    if ( orderItem )
                    {
                        vm.product          = info ? info.product : null;
                        vm.orderItem        = orderItem;
                        vm.isDraftOrder     = isDraft;
                        vm.sizeVms          = createSizeVms();
                        vm.typeVms          = createOptionTypeVms();

                        vm.addToCart        = addToCart;
                    }

                    !orderItem && showCatalog( );

                });

                // *********************************************************
                // Private methods
                // *********************************************************


                function showCatalog( category )
                {
                   // $state.go('app.order.menu', {category : $stateParams.category});
                }

                function getOrderItemInfo( options )
                {
                        // id may be `productId` or `orderItemId`, depending upon stateParams
                        // `category` identifies the group of products: pizza, drinks, salads

                    var id        = options.orderId || options.productId
                        ,category = options.category
                        ,isOrder  = options.orderId != null;

                    var item, product, sizes;

                    if ( isOrder ) {
                        // reached this page from an existing orderItem so id is the orderItemId
                        item = getSelectedItem(id, category);
                        if (item) {
                            product = item.product;
                            sizes = dataservice.productSizes.byProduct(product);
                        }
                    } else {
                        // reached here from product list page so id is the productId
                        product = dataservice.products.byId(id);
                        if (product) {
                            sizes = dataservice.productSizes.byProduct(product);
                            item = getOrderItemByProduct(product, sizes[0]);
                        }
                    }
                    return {
                        orderItem: item,
                        product: product,
                        sizes: sizes
                    };
                }

                // Get the order item by the order item id.  Returns falsey if not found.
                function getSelectedItem(id, category ) {

                    return cartOrder.getSelectedItem(id);
                }

                // Find an orderItem on the draft order for the given product.
                // Create a new orderItem if none found.
                function getOrderItemByProduct(product, defaultSize) {

                    if ( !draftOrder ) return null;

                    var prodId = product.id;
                    var item =  draftOrder.orderItems.filter(function (oi)
                                {
                                    return oi.productId == prodId;
                                })[0];

                    if (!item) {
                        item = draftOrder.addNewItem(product);
                        item.productSize = defaultSize;
                    }
                    return item;
                }
                /*** OptionVms   ***/
                // A VM for each productOption for the given product
                // The VM has an itemOption if the current OrderItem has an ItemOption for that product
                function createOptionVms() {
                    var options = dataservice.productOptions.byProduct(info.product);

                    var itemOptions =
                        util.keyArray(orderItem.orderItemOptions, function (o) { return o.productOptionId; });

                    return options.map(function (po) {
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

                /*** OptionTypeVms   ***/
                // A VM for type of productOption.
                // Contains the OptionVms
                // This OptionTypeVm VM will be displayed in a tab
                function createOptionTypeVms() {
                    // group the productOptions by type so they can be displayed in Tab viewmodels
                    var optionVms = createOptionVms();
                    var typeGrps = util.groupArray( optionVms,
                        function (vm) { return vm.productOption.type; }, 'type', 'options');
                    var typeVms = typeGrps.map(function (tg) {return new OptionTypeVm(tg)});
                    return typeVms;
                }

                // typeVm: a viewmodel of the OrderItemOptions for a particular product type
                function OptionTypeVm(typeGroup){
                    var typeVm = this;
                    typeVm.type = typeGroup.type;
                    typeVm.options = typeGroup.options;
                    typeVm.title = util.toTitle(typeVm.type);
                    // distribute the options in each tab among 3 columns
                    typeVm.columnOptions = util.deal(typeVm.options, 3);
                    setOptionTypeVmCostFlags(typeVm);
                    // indicates which typeVms allow only one choice
                    typeVm.oneChoice = typeVm.type == 'crust'; // can only pick one crust

                    if (typeVm.oneChoice) {ensureOneOptionSelected();}

                    function ensureOneOptionSelected(){
                        // Only one choice allowed among options
                        // Will display with radio buttons which, unlike checkboxes,
                        // must bind to something other than the choices.
                        // The `tab.selectedOptionId` is that something.
                        // p.s.: can't bind to option itself because of Ng circular-ref failure
                        typeVm.selectedOptionId = typeVm.options[0].id; // default selection
                        typeVm.options.forEach(function (opt) {
                            // override default if any of the options is already selected
                            if (opt.selected) typeVm.selectedOptionId = opt.id;});
                        typeVm.selectOneOption();
                    }

                    function setOptionTypeVmCostFlags(typeVm) {
                        var maxFactor = 0;
                        typeVm.options.forEach(function (o) {
                            maxFactor = Math.max(maxFactor, o.productOption.factor);
                        });
                        typeVm.allFree = maxFactor === 0;
                        typeVm.someCostMore = maxFactor > 1;
                    }
                }

                OptionTypeVm.prototype.selectOneOption  = selectOneOption;
                OptionTypeVm.prototype.selectOption = selectOption;

                function selectOneOption() {
                    var optionTypeVm = this;
                    var selectedId = parseInt(optionTypeVm.selectedOptionId);
                    // reset the selected state for every option in this OptionVm
                    optionTypeVm.options.forEach(function (optionVm) {
                        optionVm.selected = optionVm.id === selectedId;
                        optionTypeVm.selectOption(optionVm);
                    });
                }

                function selectOption(optionVm) {
                    var itemOption = optionVm.itemOption;

                    if (optionVm.selected) {
                        if (!itemOption) {// no itemOption; create one
                            optionVm.itemOption = orderItem.addNewOption(optionVm.productOption);
                        }
                    } else if (itemOption) { // option de-selected; remove it
                        orderItem.removeOption(itemOption);
                        optionVm.itemOption = null;
                    }
                }


                function createSizeVms() {
                    var isPremium = info.product.isPremium;
                    return info.sizes.map(function (size) {
                        return {
                            id: size.id,
                            name: size.name,
                            price: isPremium ? (size.premiumPrice ||size.price) : size.price
                        };
                    });
                }

                function addToCart() {
                    if (isDraft) {
                        //don't need to remove if item is an entity (e.g, SQL version)
                        draftOrder.removeItem(orderItem);
                        cartOrder.addItem(orderItem);
                        util.logger.info("Added item to cart");

                        showCatalog();
                    }
                }



            };

}( this.angular ));
