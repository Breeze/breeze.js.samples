/**
 *  Use aysnc script loader, configure the application module (for AngularJS)
 *  and initialize the application ( which configures routing )
 *
 *  @author Thomas Burleson
 */

(function( head ) {
    "use strict";

    var app;

    head.js(

          { jquery       : "./vendor/jquery/jquery.min.js"                   }
        , { angular      : "./vendor/angular/angular.js"                     }
        , { ngRoute      : "./vendor/angular-route/angular-route.js"         }
        , { ngSanitize   : "./vendor/angular-sanitize/angular-sanitize.js"   }
        , { uibootstrap  : "./vendor/angular-bootstrap/ui-bootstrap-tpls.js" }

        , { toastr       : "./vendor/toastr/toastr.js"                       }

        , { breeze_debug : "./breeze/breeze.debug.js"                    }
        , { breeze_ng    : "./breeze/breeze.angular.js"                  }
        , { breeze_mongo : "./breeze/breeze.dataservice.mongo.js"        }
        , { breeze_metah : "./breeze/breeze.metadata-helper.js"          }

    )
    .ready("ALL", function() {

        app = angular.module( "app", [ 'ngRoute' ] )
                     .run( configureToastr );
        head.js(

              "./app/services/util.js"
            , "./app/services/logger.js"
            , "./app/config/config.js"
            , "./app/controllers/appController.js"
            , "./app/controllers/cartController.js"
            , "./app/controllers/dashboardController.js"
            , "./app/controllers/orderItemController.js"
            , "./app/controllers/orderProductController.js"
            , "./app/directives/productImgSrcDirective.js"
            , "./app/services/dataservice.js"
            , "./app/services/databaseReset.js"
            , "./app/services/dataservice.js"
            , "./app/services/entityManagerFactory.js"
            , "./app/services/metadata.js"
            , "./app/services/model.js"
            , "./app/services/pricing.js"
            , "./app/routes/routeManager.js"
            , "./app/routes/routeController.js"

        );

            // **************************************
            // Private construction function
            // **************************************

            function configureToastr( util )
            {
                // configure toastr for this app
                toastr.options.timeOut = 2000; // 2 second toast timeout
                toastr.options.positionClass = 'toast-bottom-right';

                util.logger.info("app module is loaded and running on " + util.config.server);

            };

    });


}( window.head ));
