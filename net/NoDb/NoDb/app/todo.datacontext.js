window.todoApp = window.TodoApp || {};

window.todoApp.datacontext = (function (breeze) {
    var manager, metadataStore;
    configureForBreeze();

    var datacontext = {
        clearCache: clearCache,
        createTodoItem: createTodoItem,
        createTodoList: createTodoList,
        deleteTodoItem: deleteTodoItem,
        deleteTodoList: deleteTodoList,
        getTodoLists: getTodoLists,
        metadataStore: metadataStore,
        saveNewTodoItem: saveNewTodoItem,
        saveNewTodoList: saveNewTodoList,
    };

    return datacontext;

    //#region Private Members

    function clearCache() {
        manager.clear();
    }

    function configureForBreeze() {
        breeze.NamingConvention.camelCase.setAsDefault();

        var dataService = new breeze.DataService({
            serviceName: "breeze/Todo",
            hasServerMetadata: false // don't ask the server for metadata
        });

        manager = new breeze.EntityManager({ dataService: dataService });
        metadataStore = manager.metadataStore;
        manager.enableSaveQueuing(true);
        configureManagerToSaveModifiedItemImmediately();
    }

    function configureManagerToSaveModifiedItemImmediately() {
        manager.entityChanged.subscribe(function (args) {
            if (args.entityAction === breeze.EntityAction.EntityStateChange) {
                var entity = args.entity;
                if (entity.entityAspect.entityState.isModified()) {
                    saveEntity(entity);
                }
            }
        });
    }
    
    function createTodoItem(initialValues) {
        return manager.createEntity("TodoItem", initialValues);
    }
    
    function createTodoList(initialValues) {
        return manager.createEntity("TodoList", initialValues);
    }
   
    function deleteTodoItem(todoItem) {
        todoItem.entityAspect.setDeleted();
        return saveEntity(todoItem);
    }
    
    function deleteTodoList(todoList) {       
        // Neither breeze nor server cascade deletes so we have to do it
        var todoItems = todoList.todos().slice(); // iterate over copy
        todoItems.forEach(function(entity) { entity.entityAspect.setDeleted(); });
        todoList.entityAspect.setDeleted();
        return saveEntity(todoList);
    }

    function getTodoLists(todoListsObservable, errorObservable) {
        return breeze.EntityQuery
            .from("TodoLists")
            .using(manager).execute()
            .then(getSucceeded)
            .catch(getFailed);

        function getSucceeded(data) {
            todoListsObservable(data.results);
        }

        function getFailed(error) {
            errorObservable("Error retrieving todo lists: " + error.message);
        }
    }

    function saveEntity(masterEntity) {

        return manager.saveChanges().catch(saveFailed);

        function saveFailed(error) {
            setErrorMessage(error);
            // Let them see it "wrong" briefly before reverting"
            setTimeout(function() { manager.rejectChanges(); }, 1000);
            throw error; // so caller can see failure
        }

        function setErrorMessage(error) {
            var statename = masterEntity.entityAspect.entityState.name.toLowerCase();
            var typeName = masterEntity.entityType.shortName;
            var msg = "Error saving " + statename + " " + typeName + ": ";

            var reason = error.message;

            if (error.entityErrors) {
                reason = getValidationErrorMessage(error);
            } else if (isConcurrencyError(error)) {
                reason =
                    "can't find " + typeName + "; another user may have deleted it.";
            }
            masterEntity.errorMessage(msg + reason);
        }

        function getValidationErrorMessage(error) {
            try { // return the first error message
                var firstError = error.entityErrors[0];
                return firstError.errorMessage;
            } catch(e) { // ignore problem extracting error message 
                return "validation error";
            }
        }

        function isConcurrencyError(error) {
            var detail = error.detail;
            return detail && detail.ExceptionMessage &&
                detail.ExceptionMessage.match(/can't find/i);
        }
    }

    function saveNewTodoItem(todoItem) {
        return saveEntity(todoItem);
    }

    function saveNewTodoList(todoList) {
        return saveEntity(todoList);
    } 

    //#endregion
    
})(breeze);