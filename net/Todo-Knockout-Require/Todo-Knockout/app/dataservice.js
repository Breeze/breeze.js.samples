/*
 * The data access service for this app.
 * It requires the Breeze Labs breeze.savequeuing extension which patches Breeze itself.
 * Get it from https://github.com/Breeze/breeze.js.labs/blob/master/breeze.savequeuing.js
 * This extension module doesn't return a value so we don't both providing a parameter for it
 * in the module defining function.
 */
define(['jquery', 'ko', 'breeze', 'logger', 'breeze.savequeuing'], function ($, ko, breeze, logger) {
    

    var serviceName = 'breeze/todos'; // route to the same origin Web Api controller

    // *** Cross origin service example  ***
    // When data server and application server are in different origins
    //var serviceName = 'http://sampleservice.breezejs.com/api/todos/';

    var manager = new breeze.EntityManager(serviceName);
    manager.enableSaveQueuing(true);
    addTodoProperties();

    return {
        addPropertyChangeHandler: addPropertyChangeHandler,
        createTodo: createTodo,
        deleteTodoAndSave: deleteTodoAndSave,
        getTodos: getTodos,
        hasChanges: hasChanges,
        purge: purge,
        reset: reset,
        saveChanges: saveChanges
    };

    /*** implementation details ***/

    function addPropertyChangeHandler(handler) {
        // call handler when an entity property of any entity changes
        return manager.entityChanged.subscribe(function (changeArgs) {
            var action = changeArgs.entityAction;
            if (action === breeze.EntityAction.PropertyChange) {
                handler(changeArgs);
            }
        });
    }

    function addTodoProperties() {
        // untracked 'isEditing' property to the 'TodoItem' type
        // see http://www.breezejs.com/sites/all/apidocs/classes/MetadataStore.html#method_registerEntityTypeCtor
        var metadataStore = manager.metadataStore;
        metadataStore.registerEntityTypeCtor('TodoItem', null, todoInit);

        function todoInit(todo) {
            todo.isEditing = ko.observable(false);
        }
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
                .from("Todos")
                .orderBy("CreatedAt");

        if (!includeArchived) { // exclude archived Todos
            // add filter clause limiting results to non-archived Todos
            query = query.where("IsArchived", "==", false);
        }

        return manager.executeQuery(query);
    }

    function handleSaveValidationError(error) {
        var message = "Not saved due to validation error";
        try { // fish out the first error
            var firstErr = error.entityErrors[0];
            message += ": " + firstErr.errorMessage;
        } catch (e) { /* eat it for now */ }
        return message;
    }

    function hasChanges() {
        return manager.hasChanges();
    }

    function saveChanges() {
        return manager.saveChanges()
            .then(saveSucceeded)
            .fail(saveFailed);

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
            setTimeout(function () {
                manager.rejectChanges();
            }, 1000);
            throw error; // so caller can see it
        }
    }

    //#region demo operations
    function purge(callback) {
        return $.post(serviceName + '/purge')
        .then(function () {
            logger.success("database purged.");
            manager.clear();
            if (callback) callback();
        })
        .fail(function (error) {
            logger.error("database purge failed: " + error);
        });
    }

    function reset(callback) {
        return $.post(serviceName + '/reset')
        .then(function () {
            logger.success("database reset.");
            manager.clear();
            if (callback) callback();
        })
        .fail(function (error) {
            logger.error("database reset failed: " + error);
        });
    }
    //#endregion

});