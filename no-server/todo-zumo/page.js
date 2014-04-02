/*
 * page - the controller for the page view
 */
(function() {

    angular.module('app').controller('pageController',
        ['$scope', '$timeout', 'datacontext', 'wip-service', controller]);

    function controller($scope, $timeout, datacontext, wip) {
        var wipMsgCount = 0;

        var vm = this;
        vm.addItem = addItem;
        vm.counts = datacontext.counts;
        vm.deleteItem = deleteItem;
        vm.isBusy = false;
        vm.itemsFilter = itemsFilter;
        vm.errorLog = [];
        vm.newItemText = '';
        vm.refresh = refresh;
        vm.reset = reset;
        vm.sync = sync;
        vm.syncDisabled = syncDisabled;
        vm.showCompleted = false;
        vm.showDeleted = false;
        vm.todos = [];
        vm.wipMessages = [];

        listenForWipMessages();
        loadTodoItems(); // initial load

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

        function getAllTodoItems() {
            vm.isBusy = true;
            return datacontext.getAllTodoItems().then(querySuccess, handleError);
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

        function listenForWipMessages(){
            $scope.$on(wip.eventName(), function(event, message){
                vm.wipMessages.push((wipMsgCount+=1)+' - '+message);
                $timeout(function(){vm.wipMessages.length=0;}, 3000);
            })
        }

        function loadTodoItems(){
            vm.isBusy = true;
            return datacontext.loadTodoItems().then(querySuccess, handleError);
        }

        function querySuccess(todoItems){
            vm.isBusy = false;
            vm.todos = todoItems;
        }

        function refresh(){
            addItem();  // might have one pending
            return getAllTodoItems();
        }

        function reset(){
            vm.newItemText='';
            return datacontext.reset(); // not implemented yet
        }

        function sync(){
            addItem(); // might have one pending
            vm.isBusy = true;
            return datacontext.sync().then(querySuccess, handleError);
        }

        function syncDisabled(){
            return vm.isBusy;
        }
    }
})();