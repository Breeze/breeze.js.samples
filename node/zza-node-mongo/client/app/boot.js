/**
 *  Use aysnc script loader, configure the application module (for AngularJS)
 *  and initialize the application ( which configures routing )
 *
 *  @author Thomas Burleson
 */

(function( head ) {
    "use strict";

    var app;
    /* Load vendor libraries */
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
    /* Define 'app' module and load application scripts */
    .ready("ALL", function() {

        app = angular.module( "app", [ 'breeze.angular', 'ui.router', 'ui.bootstrap' ] )

        head.js(
            /* Feature Areas: views and controllers */
              "./app/menu/menu.js"
            , "./app/order/cart.js"
            , "./app/order/optionTypeVm.js"
            , "./app/order/orderItem.js"
            , "./app/order/orderSidebar.js"
            , "./app/shell/header.js"

            /* Directives & Routing */
            , "./app/directives/productImgSrcDirective.js"
            , "./app/routeStates.js"

            /* Services */
            , "./app/services/config.js"
            , "./app/services/databaseReset.js"
            , "./app/services/dataservice.js"
            , "./app/services/dataservice.lookups.js"
            , "./app/services/entityManagerFactory.js"
            , "./app/services/logger.js"
            , "./app/services/metadata.js"
            , "./app/services/model.js"
            , "./app/services/pricing.js"
            , "./app/services/util.js"
        )
        .ready("ALL", function()
        {
             app.run( function ( util )
             {
                 util.logger.info( "Zza SPA is loaded and running on " + util.config.server );
             });
        });

    });

}( window.head ));
