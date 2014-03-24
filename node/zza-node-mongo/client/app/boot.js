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
        , { ngSanitize   : "./vendor/angular-sanitize/angular-sanitize.js"   }
        , { uiRoute      : "./vendor/angular-ui-router/release/angular-ui-router.js" }
        , { uibootstrap  : "./vendor/angular-bootstrap/ui-bootstrap-tpls.js" }

        , { toastr       : "./vendor/toastr/toastr.js"                       }

        , { breeze_debug : "./breeze/breeze.debug.js"                    }
        , { breeze_ng    : "./breeze/breeze.angular.js"                  }
        , { breeze_mongo : "./breeze/breeze.dataservice.mongo.js"        }
        , { breeze_metah : "./breeze/breeze.metadata-helper.js"          }

    )
    .ready("ALL", function() {

        app = angular.module( "app", [ 'breeze.angular', 'ui.router', 'ui.bootstrap' ] )

        head.js(
              "./app/config/config.js"

            , "./app/controllers/session.js"
            , "./app/controllers/header.js"
            , "./app/controllers/orders/order.js"
            , "./app/controllers/orders/orderSidebar.js"
            , "./app/controllers/orders/orderItem.js"
            , "./app/controllers/catalog.js"
            , "./app/controllers/orders/cart.js"

            , "./app/directives/productImgSrcDirective.js"
            , "./app/services/util.js"
            , "./app/services/logger.js"
            , "./app/services/dataservice.js"
            , "./app/services/databaseReset.js"
            , "./app/services/dataservice.js"
            , "./app/services/entityManagerFactory.js"
            , "./app/services/metadata.js"
            , "./app/services/model.js"
            , "./app/services/pricing.js"

            // UI-routing configurations

            , "./app/routes/routeMap.js"
            , "./app/routes/routeStates.js"

        )
        .ready("ALL", function()
        {
             app.run( function configureToastr( util )
             {
                 // Configure toastr for this app
                 // 2 second toast timeout

                 toastr.options.timeOut       = 2000;
                 toastr.options.positionClass = 'toast-bottom-right';

                 util.logger.info( "Zza SPA is loaded and running on " + util.config.server );
             });
        });



    });


}( window.head ));
