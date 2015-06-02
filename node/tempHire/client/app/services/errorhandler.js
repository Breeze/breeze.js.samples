(function(angular) {
    'use strict';

    angular.module('services').factory('errorhandler', ['$componentLoader', '$location', '$router', 'logger', 'utilities', factory]);

    function factory($componentLoader, $location, $router, logger, util) {
        var ErrorHandler = (function () {

            var ctor = function (targetObject) {
                this.handleError = function (error) {
                    if (error.entityErrors) {
                        error.message = util.getSaveValidationErrorMessage(error);
                    }

                    logger.logError(error.message, null, getModuleId(targetObject), true);
                    throw error;
                };

                this.log = function (message, showToast) {
                    logger.log(message, null, getModuleId(targetObject), showToast);
                };
            };

            return ctor;
        })();

        

        return {
            includeIn: includeIn
        };

        function includeIn(targetObject) {
            var componentLoader = $componentLoader;
            var locationService = $location;
            var routerService = $router;
            return $.extend(targetObject, new ErrorHandler(targetObject));
        }

        function getModuleId(obj) {
            return obj.moduleId;
        }
    }

})(window.angular);