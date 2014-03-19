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

        { breeze_ng    : "./src/breeze/breeze.angular.js"                  },
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


        require( [ "main" ], function( app )
        {
            // Application has bootstrapped and started...
        });


    });


}( window.head ));
