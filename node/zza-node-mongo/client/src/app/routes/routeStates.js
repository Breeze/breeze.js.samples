(function( angular, supplant ) {
    'use strict';

    angular.module( "app" )
           .config( routeStates );

    // **************************************
    // Private construction function
    // **************************************

    function routeStates($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('app',             {
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
            .state( 'app.welcome',    {
                url : '/welcome',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/welcome.html'
                    }
                }
            })
            .state( 'app.about',      {
                url : '/about',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/about.html'
                    }
                }
            })
            .state( 'app.order',      {

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
            .state( 'app.order.catalog', {

                // This state shows the Product listings (pizza, salads, drinks)
                // from which a product can be selected; selection navigates to the
                // the produce details page.

                url : '/:category',
                views : {
                    'content@app.order' : {
                        templateUrl: function( $stateParams )
                        {
                            // Should we navigate to the products list view or the item details view ?
                            var listProductsURL = ('src/app/views/catalog/' + $stateParams.category + '.html'),
                                viewItemURL     = 'src/app/views/orders/orderItem.html';

                            return $stateParams.productId ? viewItemURL : listProductsURL;
                        }
                    }
                }
            })
            .state( 'app.order.item', {

                // This state shows the OrderItem editor for an item currently in your cart

                url : '/:category/:productId',
                views : {
                    'content@app.order' : {
                        templateUrl : function( $state, $stateParams)
                        {
                            return 'src/app/views/orders/orderItem.html';
                        }
                    }
                }
            })
            .state( 'app.order.cart', {

                // This state shows the Cart items list view; and shows
                // both order item and total cart costs....

                url : '/cart',
                views : {
                    'content@app.order' : {
                        templateUrl : 'src/app/views/orders/cart.html'
                    }
                }
            });



        $urlRouterProvider
            .when( '/orderPizza',  '/order/pizza'  )  // Switch to Pizza listing view
            .when( '/orderSalad',  '/order/salad'  )  // Switch to Salad listing view
            .when( '/orderDrinks', '/order/drinks'  ) // Switch to Salad listing view
            .otherwise('/orderPizza');                // Return to the main/welcome screen
    }

}( this.angular, this.supplant ));
