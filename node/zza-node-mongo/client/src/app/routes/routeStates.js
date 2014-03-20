(function(angular) {
    'use strict';

    angular.module( "app" )
           .config( routeStates );

    // **************************************
    // Private construction function
    // **************************************

    function routeStates($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('app', {
                url: '/home',
                views: {
                    'header': {
                        templateUrl: 'src/app/views/header.html',
                        controller : 'navController'
                    },
                    'content': {
                        templateUrl: 'src/app/views/home.html'
                    },
                    'footer': {
                        templateUrl: 'src/app/views/footer.html'
                    }
                }
            })
            .state( 'app.about', {
                url : '/about',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/about.html'
                    }
                }
            })
            .state( 'app.order', {
                url : '/order',
                views : {
                    'content@' : {
                        templateUrl: 'src/app/views/orders/order.html'
                    },
                    'dashboard@app.order' : {
                        templateUrl: 'src/app/views/orders/sidebar.html',
                        controller : 'orderSidebarController'
                    }
                }
            });

        $urlRouterProvider.otherwise('/home');
    }

}( this.angular ));
