/*
 * Beginnings of Thomas Burleson's require-based packaging experiment
 */
(function( window ) {
    "use strict";

    var defaultAppName = "app",
        angular, define;

    var ERRORS = {
            REQUIRED_CONTROLLER_ID : " define.controller() requires a controller ID"
          , REQUIRED_DEFINITION    : " define() requires a definition function as the second argument"
        };


    if ( window.angular )
    {
        angular = window.angular;
        define  = window.define || { };

        define["controller"] = controllerFn;

        window.define = define;
    }

    // ***********************************************
    // Private wrapper methods
    // ***********************************************

    /**
     * Build a define.controller() function that creates
     * a define() function that implicitly calls app.controller(...)
     *
     */
    function controllerFn( controllerName, moduleName, moduleDepedencies )
    {
        throwOnNull( controllerName, ERRORS.REQUIRED_CONTROLLER_ID );

        return function define( dependencies, definition )
        {
            throwOnNull( definition, ERRORS.REQUIRED_DEFINITION );

            return moduleFn( moduleName, moduleDepedencies )
                       .controller(
                            controllerName,
                            definition
                       );
        }
    }

    function moduleFn( moduleName, moduleDepedencies )
    {
        return angular.module(
                    moduleName        || defaultAppName,
                    moduleDepedencies || [ ]
               );
    }

    function throwOnNull( target, errorMessage )
    {
        if ( !target )
        {
            throw new Error( errorMessage );
        }
    }

}( this ));
