window.todoApp.todoListViewModel = (function (ko, datacontext) {

    var todoLists = ko.observableArray(),
        error     = ko.observable();

    getTodoLists();

    return {
        addTodoList: addTodoList,
        clearErrorMessage: clearErrorMessage,
        deleteTodoList: deleteTodoList,
        error: error,
        refresh: refresh,
        todoLists: todoLists
    };

    function addTodoList() {
        var todoList = datacontext.createTodoList();
        todoList.isEditingListTitle(true);
        datacontext.saveNewTodoList(todoList)
            .then(addSucceeded)
            .catch(addFailed);

        function addSucceeded() {
            // Insert new TodoList at the front of the lists
            todoLists.unshift(todoList); 
        }

        function addFailed() {
            error("Save of new TodoList failed");
        }
    }

    function clearErrorMessage(thing) {
        if (thing.errorMessage) {
            thing.errorMessage(null);
        }
    }

    function deleteTodoList(todoList) {
        var ix = todoLists.indexOf(todoList);
        todoLists.remove(todoList);
        datacontext.deleteTodoList(todoList).catch(deleteFailed);

        function deleteFailed() {
            // re-show the restored list where it was
            todoLists.splice(ix, 0, todoList);
        }
    }

    function getTodoLists() {
        datacontext.getTodoLists(todoLists, error); 
    }

    function refresh() {
        datacontext.clearCache();
        getTodoLists();
    }

})(ko, todoApp.datacontext);

// Initiate the Knockout bindings
ko.applyBindings(window.todoApp.todoListViewModel);
