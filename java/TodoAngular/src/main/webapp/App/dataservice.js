/* dataservice: data access and model management layer 
 * relies on Angular injector to provide:
 *     $timeout - Angular equivalent of 'setTimeout'
 *     breeze - the Breeze.Angular service (which is breeze itself)
 *     logger - the application's logging facility
 */
(function() {

    angular.module('app').factory('dataservice',
    ['$http', '$q', '$timeout', 'breeze', 'logger', dataservice]);

    function dataservice($http, $q, $timeout, breeze, logger) {

        //TODO: document this difference
        breeze.core.config.initializeAdapterInstance("uriBuilder", "json");
        //TODO: document this difference
        new pascalToCamelCaseConvention().setAsDefault();

        var serviceName = 'breeze/todos'; // route to the same origin Web Api controller

        // *** Cross origin service example  ***
        // When data server and application server are in different origins
        //var serviceName = 'http://sampleservice.breezejs.com/api/todos/';

        var manager = new breeze.EntityManager(serviceName);
        manager.enableSaveQueuing(true);

        var service = {
            addPropertyChangeHandler: addPropertyChangeHandler,
            createTodo: createTodo,
            deleteTodoAndSave: deleteTodoAndSave,
            getTodos: getTodos,
            hasChanges: hasChanges,
            purge: purge,
            reset: reset,
            removePropertyChangeHandler: removePropertyChangeHandler,
            saveChanges: saveChanges
        };
        return service;

        /*** implementation details ***/

        function addPropertyChangeHandler(handler) {
            // Actually adds any 'entityChanged' event handler
            // call handler when an entity property of any entity changes
            return manager.entityChanged.subscribe(function(changeArgs) {
                var action = changeArgs.entityAction;
                if (action === breeze.EntityAction.PropertyChange) {
                    handler(changeArgs);
                }
            });
        }

        function createTodo(initialValues) {
            return manager.createEntity('TodoItem', initialValues);
        }

        function deleteTodoAndSave(todoItem) {
            if (todoItem) {
                var aspect = todoItem.entityAspect;
                if (aspect.isBeingSaved && aspect.entityState.isAdded()) {
                    // wait to delete added entity while it is being saved  
                    setTimeout(function () { deleteTodoAndSave (todoItem); }, 100);
                    return;          
                } 
                aspect.setDeleted();
                saveChanges();
            }
        }

        function getTodos(includeArchived) {
            var query = breeze.EntityQuery
                .from("TodoItems")	//TODO: document this difference
                .orderBy("CreatedAt");

            if (!includeArchived) { // if excluding archived Todos ...
                // add filter clause limiting results to non-archived Todos
                query = query.where("IsArchived", "==", false);
            }

            var promise = manager.executeQuery(query).catch(queryFailed);
            return promise;

            function queryFailed(error) {
                logger.error(error.message, "Query failed");
                return $q.reject(error); // so downstream promise users know it failed
            }
        }

        function hasChanges() {
            return manager.hasChanges();
        }

        function handleSaveValidationError(error) {
            var message = "Not saved due to validation error";
            try { // fish out the first error
                var firstErr = error.entityErrors[0];
                message += ": " + firstErr.errorMessage;
            } catch (e) { /* eat it for now */ }
            return message;
        }

        function removePropertyChangeHandler(handler) {
            // Actually removes any 'entityChanged' event handler
            return manager.entityChanged.unsubscribe(handler);
        }

        function saveChanges() {
            return manager.saveChanges()
                .then(saveSucceeded)
                .catch(saveFailed);

            function saveSucceeded(saveResult) {
                logger.success("# of Todos saved = " + saveResult.entities.length);
                logger.log(saveResult);
            }

            function saveFailed(error) {
                var reason = error.message;
                var detail = error.detail;

                if (error.entityErrors) {
                    reason = handleSaveValidationError(error);
                } else if (detail && detail.ExceptionType &&
                    detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
                    // Concurrency error 
                    reason =
                        "Another user, perhaps the server, " +
                        "may have deleted one or all of the todos." +
                        " You may have to restart the app.";
                } else {
                    reason = "Failed to save changes: " + reason +
                        " You may have to restart the app.";
                }

                logger.error(error, reason);
                // DEMO ONLY: discard all pending changes
                // Let them see the error for a second before rejecting changes
                $timeout(function() {
                    manager.rejectChanges();
                }, 1000);
                return $q.reject(error); // so downstream promise users know it failed
            }

        }

        //#region demo operations
        function purge(callback) {
            return $http.post(serviceName + '/purge')
            .then(function () {
                logger.success("database purged.");
                manager.clear();
                if (callback) callback();
            })
            .catch(function (error) {
                logger.error("database purge failed: " + error);
                return $q.reject(error); // so downstream promise users know it failed
            });
        }

        function reset(callback) {
            return $http.post(serviceName + '/reset')
            .then(function () {
                logger.success("database reset.");
                manager.clear();
                if (callback) callback();
            })
            .catch(function (error) {
                logger.error("database reset failed: " + error);
                return $q.reject(error); // so downstream promise users know it failed
            });
        }
        
        //TODO: document this difference
        function pascalToCamelCaseConvention() {
        	  return new breeze.NamingConvention({
        	    name: 'pascalToCamelCase',
        	    clientPropertyNameToServer: clientPropertyNameToServer,
        	    serverPropertyNameToClient: serverPropertyNameToClient
        	  });
        	 
        	  function clientPropertyNameToServer(propertyName) {
        		  
        		  return propertyName.charAt(0).toLowerCase() + propertyName.substring(1, propertyName.length);
        	  }
        	         	 
        	  function serverPropertyNameToClient(propertyName) {
        		  return propertyName.charAt(0).toUpperCase()  + propertyName.substring(1, propertyName.length);
        	  }        	  
        }
        //#endregion
    }
})();