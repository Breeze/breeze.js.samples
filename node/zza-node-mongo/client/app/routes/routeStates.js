(function( angular, supplant ) {
    'use strict';

    angular.module( "app" )
           .config( routeStates );

    // **************************************
    // Private construction function
    // **************************************

    function routeStates($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('app',
            {
                url: '',
                views: {
                    'header': {
                        templateUrl: 'app/views/header.html'
                    },
                    'content': {
                        templateUrl: 'app/views/welcome.html'
                    },
                    'footer': {
                        templateUrl: 'app/views/footer.html'
                    }
                }
            })
                .state( 'app.welcome',
                {
                    url : '/welcome',
                    views : {
                        'content@' : {
                            templateUrl: 'app/views/welcome.html'
                        }
                    }
                })
                .state( 'app.about',
                {
                    url : '/about',
                    views : {
                        'content@' : {
                            templateUrl: 'app/views/about.html'
                        }
                    }
                })
                .state( 'app.order',
                {
                    // This is the shell layout for the Order dashboard (e.g. order.html)
                    // which has an orderSidebar area and an order content area
                    //
                    // NOTE: The order content can display Product listings or the OrderItem details.

                    url : '/order',
                    views : {
                        'content@' : {
                            templateUrl: 'app/views/orders/order.html'
                        },
                        'orderSidebar@app.order' : {
                            templateUrl: 'app/views/orders/orderSidebar.html'
                        },
                        'content@app.order' : {
                            // NOTE: Blank until an order time/type is selected
                        }
                    }
                })
                    .state( 'app.order.item',
                    {
                        // This state shows the OrderItem editor for an item currently in your cart

                        url : '/:category/:orderId',
                        views : {
                            'content@app.order' : {
                                templateUrl : 'app/views/orders/orderItem.html'
                            }
                        }
                    })
                    .state( 'app.order.product',
                    // The stat after a user picks a product, which implicitly
                    // switches to a draft cart OrderItem.
                    // either by locating that item in the draft cart by productId
                    // or by creating a new draft item for the product with that productId
                    {
                        url : '^/menu/:category/:productId',
                        views : {
                            'content@app.order' : {
                                templateUrl : 'app/views/orders/orderItem.html'
                            }
                        }
                    })
                    .state( 'app.order.cart',
                    {
                        // This state shows the Cart items list view; and shows
                        // both order item and total cart costs....

                        url : '/cart',
                        views : {
                            'content@app.order' : {
                                templateUrl : 'app/views/orders/cart.html'
                            }
                        }
                    })


                .state( 'app.menu',
                {
                    // This is the abstract shell layout for the Catalog dashboard
                    // ( which is currently the same as the base Order dashboard:
                    // with an orderSidebar area and an order content area )

                    url : '/menu',
                    views : {
                        'content@' : {
                            templateUrl: 'app/views/orders/order.html'
                        },
                        'orderSidebar@app.menu' : {
                            templateUrl: 'app/views/orders/orderSidebar.html'
                        },
                        'content@app.menu' : {
                            // NOTE: Blank until an order time/type is selected
                            templateUrl: 'app/views/menu/menu.html'
                        }
                    }
                })

                    .state( 'app.menu.productType',
                    {
                    // This is the Product listing view for the Catalog dashboard
                    // This state shows the Product listings (pizza, salads, drinks)
                    // from which a product can be selected; selection navigates to the
                    // the produce details page.
                    url: '/:productType',
                       views : {
                          'content@app.menu' : {
                              templateUrl: 'app/views/menu/menu.html'
                          }
                       }
                    });

        $urlRouterProvider
            //.when( '/orderPizza',  '/menu/pizza'  )  // Switch to Pizza listing view
            //.when( '/orderSalad',  '/menu/salad'  )  // Switch to Salad listing view
            //.when( '/orderDrinks', '/menu/drinks'  ) // Switch to Salad listing view
            .otherwise('/menu/pizza');               // Return to the main ordering screen
    }

}( this.angular, this.supplant ));
