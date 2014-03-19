(function( define ) {
    "use strict";


   angular.module( "app" )
           .value( 'routeMap', buildRouteMap );


    // **************************************
    // Private construction function
    // **************************************

        const views = {
            HOME        : "./src/app/views/home.html",
            ABOUT       : "./src/app/views/about.html",
            CART        : "./src/app/views/cart.html",
            TEST        : "./src/app/views/test.html",
            ORDER       : "./src/app/views/order.html",
            ORDER_PIZZA : "./src/app/views/orderProductPizza.html",
            ORDER_SALAD : "./src/app/views/orderProductSalad.html",
            ORDER_DRINK : "./src/app/views/orderProductDrinks.html"
        };

        // Declare all the routes.
        // Those with a name will be visible in the navigation bar.
        // Those with a token (e.g., :tag) are used for sub-navigation within a view.
        var navRoutes = [
            { path: '/',         name: 'Home',  templateUrl: views.HOME                                        },
            { path: '/about',    name: 'About', templateUrl: views.ABOUT                                       },
            { path: '/order',    name: 'Order', templateUrl: views.ORDER, controller: 'orderProductController' },
            { path: '/order/:product',          templateUrl: views.ORDER, controller: 'orderProductController' },
            { path: '/order/:product/:id',      templateUrl: views.ORDER, controller: 'orderItemController'    },
            { path: '/order/:orderId/item/:id', templateUrl: views.ORDER, controller: 'orderItemController'    },
            { path: '/cart',                    templateUrl: views.CART,  controller: 'cartController'         },
            { path: '/test/',                   templateUrl: views.TEST,  controller: 'testController'         },
            { path: '/test/:id',                templateUrl: views.TEST,  controller: 'testController'         }
        ];

        // Routes within the order view that lead to product list views
        var orderProductRoutes = [
            { path: '/order/pizza', name: 'Pizza',  templateUrl: views.ORDER_PIZZA    ,tag: 'pizza' },
            { path: '/order/salad', name: 'Salad',  templateUrl: views.ORDER_SALAD    ,tag: 'salad' },
            { path: '/order/drink', name: 'Drinks', templateUrl: views.ORDER_DRINK    ,tag: 'drink' }
        ];

        var routesToUseResolve = {
            cartController          : { dataServiceInit: true },
            orderItemController     : { dataServiceInit: true },
            orderProductController  : { dataServiceInit: true }
        };

        function buildRouteMap( )
        {
            return {
                routes              : navRoutes,
                routesToResolve     : routesToUseResolve,

                orderProductRoutes  : orderProductRoutes,

                // visible routes are those that have a (display) name
                visibleNavRoutes    : navRoutes.filter(function (item) { return item.name; })
            };
        };


}( this.angular ));
