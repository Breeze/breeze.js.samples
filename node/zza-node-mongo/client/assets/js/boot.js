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
        ,{ require      : "./vendor/requirejs/require.js"                   }

        ,{ angular      : "./vendor/angular/angular.js"                     }
        ,{ ngRoute      : "./vendor/angular-route/angular-route.js"         }
        ,{ ngSanitize   : "./vendor/angular-sanitize/angular-sanitize.js"   }
        ,{ uibootstrap  : "./vendor/angular-bootstrap/ui-bootstrap-tpls.js" }

        ,{ breeze_ng    : "./src/breeze/breeze.angular.js"                  }
        ,{ breeze_debug : "./src/breeze/breeze.debug.js"                    }
        ,{ breeze_mongo : "./src/breeze/breeze.dataservice.mongo.js"        }

    )
    .ready("ALL", function() {

        require.config (
            {
                appDir  : '',
                baseUrl : './src/app',

                paths: {
                     "jquery": "../../vendor/jquery/jquery.min"
                    ,"toastr": "../../vendor/toastr/toastr"
                },
                shim    :
                {
                     'jquery'    : { exports : '$' }
                    ,'underscore': { exports : '_' }
                }
            });


        require( [ "test" ], function( app )
        {
            // Application has bootstrapped and started...

        });


    });


}( window.head ));
