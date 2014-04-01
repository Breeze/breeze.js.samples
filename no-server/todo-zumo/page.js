/*
 * page - the controller for the page view
 */
(function() {

    angular.module('app').controller('pageController', ['datacontext', controller]);

    function controller(datacontext) {

        var vm = this;
        vm.addItem = addItem;
        vm.counts = datacontext.counts;
        vm.deleteItem = deleteItem;
        vm.isBusy = false;
        vm.itemsFilter = itemsFilter;
        vm.errorLog = [];
        vm.newItemText = '';
        vm.reset = reset;
        vm.resetDisabled = resetDisabled;
        vm.save = save;
        vm.saveDisabled = saveDisabled;
        vm.showCompleted = false;
        vm.showDeleted = false;
        vm.todos = [];

        getTodoItems(); // initial load

        ////////////////////////////

        function addItem() {
            if (vm.newItemText !== '') {
                var newTodo = datacontext.addTodoItem({ text: vm.newItemText});
                vm.todos.unshift(newTodo);
                vm.newItemText='';
            }
        }

        function deleteItem(todoItem){
            datacontext.deleteTodoItem(todoItem);
            if (todoItem.entityAspect.entityState.isDetached()){
                // remove from the list if became detached
                var ix = vm.todos.indexOf(todoItem);
                if (ix > -1) { vm.todos.splice(ix,1); }
            }
        }

        function getTodoItems() {
            vm.isBusy = true;
            return datacontext.getTodoItems()
                .then(function(todoItems) {
                    vm.isBusy = false;
                    vm.todos = todoItems;
                })
                .catch(handleError);
        }

        function handleError(error) {
            vm.isBusy = false;
            vm.errorLog.push((vm.errorLog.length+1) + ': ' + (error && error.message || 'unknown error'));
        }

        function itemsFilter(todoItem) {
            // Beware: this is called a lot!
            var state = todoItem.entityAspect.entityState;
            return !state.isDetached() &&
                (!state.isDeleted() || vm.showDeleted)  &&
                (!todoItem.complete || vm.showCompleted);
        }

        function reset(){
            return datacontext.reset(); // not implemented yet
        }

        function resetDisabled(){
            return vm.isBusy;
        }

        function save(){
            vm.isBusy = true;
            return datacontext.save()
                .then(function(todoItems) {
                    vm.isBusy = false;
                    vm.todos = todoItems;
                })
                .catch(handleError);
        }

        function saveDisabled(){
            return vm.isBusy || !datacontext.hasChanges();
        }
    }
})();