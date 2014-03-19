/**
 *  Use aysnc script loader, configure the application module (for AngularJS)
 *  and initialize the application ( which configures routing )
 *
 *  @author Thomas Burleson
 */

(function( head ) {
    "use strict";

    head.js(

         { jquery       : "./vendor/jquery/jquery.min.js"                   }

        ,{ angular      : "./vendor/angular/angular.js"                     }
        ,{ ngRoute      : "./vendor/angular-route/angular-route.js"         }
        ,{ ngSanitize   : "./vendor/angular-sanitize/angular-sanitize.js"   }
        ,{ uibootstrap  : "./vendor/angular-bootstrap/ui-bootstrap-tpls.js" }
        ,{ toastr       : "./vendor/toastr/toastr.js"                       }

        ,{ breeze_debug : "./src/breeze/breeze.debug.js"                    }
        ,{ breeze_ng    : "./src/breeze/breeze.angular.js"                  }
        ,{ breeze_mongo : "./src/breeze/breeze.dataservice.mongo.js"        }
        ,{ breeze_metah : "./src/breeze/breeze.metadata-helper.js"          }

    )
    .ready("ALL", function() {

        head.js([

              "./app/app.js"
            , "./app/environment.js"
            , "./app/config.js"
            , "./app/metadata.js"
            , "./app/controllers/appController.js"
            , "./app/controllers/cartController.js"
            , "./app/controllers/dashboardController.js"
            , "./app/controllers/homeController.js"
            , "./app/controllers/orderItemController.js"
            , "./app/controllers/orderProductController.js"
            , "./app/controllers/routeController.js"
            , "./app/controllers/testController.js"
            , "./app/directives/directives.js"
            , "./app/filters/filters.js"
            , "./app/services/databaseReset.js"
            , "./app/services/dataservice.js"
            , "./app/services/entityManagerFactory.js"
            , "./app/services/logger.js"
            , "./app/services/model.js"
            , "./app/services/pricing.js"
            , "./app/services/routes.js"
            , "./app/services/util.js"

        ]).ready('ALL', function(){


        });

    });


}( window.head ));
