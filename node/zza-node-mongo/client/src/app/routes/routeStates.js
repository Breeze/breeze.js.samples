(function(angular) {
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
                        templateUrl: 'src/app/views/header.html',
                        controller : 'headerController'
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
                url : '/order',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/orders/order.html',
                        controller : 'orderController'
                    },
                    'sidebar@app.order' : {
                        templateUrl: 'src/app/views/orders/orderSidebar.html',
                        controller : 'orderSidebarController'
                    },
                    'orderItem@app.order' : {
                        // NOTE: Blank until an order time/type is selected
                    }
                }
            })
            .state( 'app.order.item', {
                url : '/:item',
                views : {
                    'orderItem@app.order' : {
                        templateUrl: 'src/app/views/orders/orderItem.html',
                        controller : 'orderItemController'
                    }
                }
            });

        $urlRouterProvider.otherwise('');
    }

}( this.angular ));
