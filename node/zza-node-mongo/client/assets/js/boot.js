/**
 *  Use aysnc script loader, configure the application module (for AngularJS)
 *  and initialize the application ( which configures routing )
 *
 *  @author Thomas Burleson
 */

(function( head ) {
    "use strict";

    head.js(

        // Pre-load these for splash-screen progress bar...
        { jquery       : "./vendor/jquery/jquery.min.js"                   },
        { require      : "./vendor/require/require.js"                     },

        { angular      : "./vendor/angular/angular.js"                     },
        { ngRoute      : "./vendor/angular-route/angular-route.js"         },
        { ngSanitize   : "./vendor/angular-sanitize/angular-sanitize.js"   },
        { uibootstrap  : "./vendor/angular-bootstrap/ui-bootstrap-tpls.js" },
        { toastr       : "./vendor/toastr/toastr.js"                       },

        { breeze_debug : "./src/breeze/breeze.debug.js"                    },
        { breeze_mongo : "./src/breeze/breeze.dataservice.mongo.js"        }

    )
    .ready("ALL", function() {

        require.config (
            {
                appDir  : '',
                baseUrl : './src',
                shim    :
                {
                    'underscore':
                    {
                        exports : '_'
                    }
                }
            });


        require( [ "app" ], function( app )
        {
            // Application has bootstrapped and started...
        });


    });



}( window.head ));



<!-- App libraries -->
<!-- Must load app.js first; the others can load in any order -->
    <script src="src/app/app.js"></script>
    <script src="src/app/environment.js"></script>
    <script src="src/app/config.js"></script>
    <script src="src/app/metadata.js"></script>

    <script src="src/app/controllers/cartController.js"></script>
    <script src="src/app/controllers/dashboardController.js"></script>
    <script src="src/app/controllers/homeController.js"></script>
    <script src="src/app/controllers/orderItemController.js"></script>
    <script src="src/app/controllers/orderProductController.js"></script>
    <script src="src/app/controllers/routeController.js"></script>
    <script src="src/app/controllers/testController.js"></script>

    <script src="src/app/directives/directives.js"></script>
    <script src="src/app/filters/filters.js"></script>

    <script src="src/app/services/databaseReset.js"></script>
    <script src="src/app/services/dataservice.js"></script>
    <script src="src/app/services/entityManagerFactory.js"></script>
    <script src="src/app/services/logger.js"></script>
    <script src="src/app/services/model.js"></script>
    <script src="src/app/services/pricing.js"></script>
    <script src="src/app/services/routes.js"></script>
    <script src="src/app/services/util.js"></script>

    <!-- omit appRun.js in tests -->
    <script src="src/app/appRun.js"></script>
