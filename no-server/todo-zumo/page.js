/*
 * page - the controller for the page view
 */
(function() {

    angular.module('app').controller('pageController', ['datacontext', controller]);

    function controller(datacontext) {

        var vm = this;
        vm.newItemText = '';
        vm.addItem = addItem;
        vm.deleteItem = deleteItem;
        vm.isLoading = false;
        vm.itemsFilter = itemsFilter;
        vm.errorLog = [];
        vm.refresh = refreshTodoItems;
        vm.save = save;
        vm.showCompleted = false;
        vm.todos = [];

        // On initial load, start by fetching the current data
        refreshTodoItems();

        ////////////////////////////
        function itemsFilter(todoItem) {
            return !todoItem.deleted  && (!todoItem.complete || vm.showCompleted);
            // Beware: this is called a lot!
            /*
            var itemFilterText = vm.itemFilterText;
            return itemFilterText ?
                // if there is search text, look for it in the description; else return true
                -1 != todoItem.Description.toLowerCase().indexOf(itemFilterText.toLowerCase()) :
                true;
            */
        }

        function refreshTodoItems() {
            vm.isLoading = true;
            return datacontext.refreshTodoItems()
                .then(function(todoItems) {
                    vm.isLoading = false;
                    vm.todos = todoItems;
                })
                .then(null, handleError);
        }

        function handleError(error) {
            vm.isLoading = false;
            vm.errorLog.push((vm.errorLog.length+1) + ': ' + (error && error.message || 'unknown error'));
        }

        function addItem() {
            if (vm.newItemText !== '') {
                datacontext.addTodoItem({ text: vm.newItemText})
                    .then(refreshTodoItems, handleError);
            }
        }

        function deleteItem(todoItem){
            datacontext.deleteTodoItem(todoItem)
                .then(refreshTodoItems, handleError);
        }

        function save(){
            return datacontext(save); // not implemented yet
        }

    }
})();