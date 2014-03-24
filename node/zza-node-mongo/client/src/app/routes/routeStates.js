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
                        templateUrl: 'src/app/views/header.html'
                    },
                    'content': {
                        templateUrl: 'src/app/views/welcome.html'
                    },
                    'footer': {
                        templateUrl: 'src/app/views/footer.html'
                    }
                }
            })
            .state( 'app.welcome',
            {
                url : '/welcome',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/welcome.html'
                    }
                }
            })
            .state( 'app.about',
            {
                url : '/about',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/about.html'
                    }
                }
            })
            .state( 'app.order',
            {
                // This is the shell layout for the Order dashboard (e.g. order.html)
                // which has Sidebar view with a order content area
                //
                // NOTE: The order content can display Product listings or the OrderItem
                //       details.

                url : '/order',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/orders/order.html'
                    },
                    'sidebar@app.order' : {
                        templateUrl: 'src/app/views/orders/sidebar.html'
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
                        templateUrl : 'src/app/views/orders/orderItem.html'
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
                        templateUrl : 'src/app/views/orders/cart.html'
                    }
                }
            })
            .state( 'app.menu',
            {
                // This is the abstract shell layout for the Catalog dashboard
                // ( which is currently the same as the base Order dashboard:
                // with s Sidebar view with a order content area )

                url : '/menu',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/orders/order.html'
                    },
                    'sidebar@app.menu' : {
                        templateUrl: 'src/app/views/orders/sidebar.html'
                    },
                    'content@app.menu' : {
                        // NOTE: Blank until an order time/type is selected
                    }
                }
            })
            .state( 'app.menu.products',
            {
                // This is the Product listing view for the Catalog dashboard
                //
                // This state shows the Product listings (pizza, salads, drinks)
                // from which a product can be selected; selection navigates to the
                // the produce details page.

                url : '/:category',
                views : {
                    'content@app.menu' : {
                        templateUrl: function( $stateParams )
                        {
                            // Make sure we have a valid product `category`

                            // TODO - use templateProvider to inject `routes` information
                            //        that can be used to determine acceptable routes...

                            var category = ($stateParams.nCategory || "").toLowerCase(),
                                isValid  = (['pizza','salad','drink'].indexOf(category) > -1);

                            if ( !isValid ) category = 'pizza'

                            return 'src/app/views/catalog/' + category + '.html';
                        }
                    }
                }
            })
            .state( 'app.menu.products.item',
            {
                // This state shows the product details for an recently viewed product

                url : '/:productId',
                views : {
                    'content@app.menu' : {
                        templateUrl : 'src/app/views/orders/orderItem.html'
                    }
                }
            });



        $urlRouterProvider
            .when( '/orderPizza',  '/menu/pizza'  )  // Switch to Pizza listing view
            .when( '/orderSalad',  '/menu/salad'  )  // Switch to Salad listing view
            .when( '/orderDrinks', '/menu/drinks'  ) // Switch to Salad listing view
            .otherwise('/menu/pizza');               // Return to the main/welcome screen
    }

}( this.angular, this.supplant ));
