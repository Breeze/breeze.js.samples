define(['dataservice', 'ko', 'logger', 'Q'], function (dataservice, ko, logger, Q) {

    var vm = {
        addItem: addItem,
        archiveCompletedItems: archiveCompletedItems,
        //archiveCompletedMessage - see addComputed()
        deleteItem: deleteItem,
        editBegin: editBegin,
        editEnd: editEnd,
        includeArchived: ko.observable(false),
        items: ko.observableArray(),
        //itemsLeftMessage - see addComputed()
        //markAllCompleted - see addComputed()
        newTodoDescription: ko.observable(""),
        purge: purge,
        reset: reset
    };

    var suspendSave = false;

    initVm();

    return vm; // done with setup; return module variable

    /* Implementation */

    function initVm() {
        vm.includeArchived.subscribe(getTodos);
        addComputeds();
        getTodos();

        // Listen for property change of ANY entity so we can (optionally) save
        dataservice.addPropertyChangeHandler(propertyChanged);
    }

    function addComputeds() {
        vm.archiveCompletedMessage = ko.computed(function () {
            var count = getStateOfItems().itemsDoneCount;
            if (count > 0) {
                return "Archive " + count + " completed item" + (count > 1 ? "s" : "");
            }
            return null;
        });

        vm.itemsLeftMessage = ko.computed(function () {
            var count = getStateOfItems().itemsLeftCount;
            if (count > 0) {
                return count + " item" + (count > 1 ? "s" : "") + " left";
            }
            return null;
        });

        vm.markAllCompleted = ko.computed({
            read: function () {
                var state = getStateOfItems();
                return state.itemsLeftCount === 0 && vm.items().length > 0;
            },
            write: function (value) {
                suspendSave = true;
                vm.items().forEach(function (item) {
                    item.IsDone(value);
                });
                suspendSave = false;
                save();
            }
        });
    }

    function archiveCompletedItems() {
        var state = getStateOfItems();
        suspendSave = true;
        state.itemsDone.forEach(function (item) {
            if (!vm.includeArchived()) {
                vm.items.remove(item);
            }
            item.IsArchived(true);
        });
        suspendSave = false;
        save();
    }

    function getTodos() {
        dataservice.getTodos(vm.includeArchived())
            .then(querySucceeded)
            .fail(queryFailed);

        function querySucceeded(data) {
            vm.items(data.results);
            logger.info("Fetched Todos " +
                (vm.includeArchived() ? "including archived" : "excluding archived"));
        }
        function queryFailed(error) {
            logger.error(error.message, "Query failed");
        }
    }

    function addItem() {
        var description = vm.newTodoDescription();
        if (!description) { return; }

        var item = dataservice.createTodo({
            Description: description,
            CreatedAt: new Date(),
            IsDone: vm.markAllCompleted()
        });

        save(true).catch(addFailed);
        vm.items.push(item);
        vm.newTodoDescription("");

        function addFailed() {
            var index = vm.items.indexOf(item);
            if (index > -1) {
                setTimeout(function () { vm.items.splice(index, 1); }, 2000);
            }
        }
    }

    function editBegin(item) { item.isEditing(true); }

    function editEnd(item) { item.isEditing(false); }

    function deleteItem(item) {
        vm.items.remove(item);
        dataservice.deleteTodo(item);
        save(true);
    }

    function getStateOfItems() {
        var itemsDone = [], itemsLeft = [];

        vm.items().forEach(function (item) {
            if (item.IsDone()) {
                if (!item.IsArchived()) {
                    itemsDone.push(item); // only unarchived items                
                }
            } else {
                itemsLeft.push(item);
            }
        });

        return {
            itemsDone: itemsDone,
            itemsDoneCount: itemsDone.length,
            itemsLeft: itemsLeft,
            itemsLeftCount: itemsLeft.length
        };
    }

    function propertyChanged(changeArgs) {
        // propertyChanged triggers save attempt UNLESS the property is the 'Id'
        // because THEN the change is actually the post-save Id-fixup 
        // rather than user data entry so there is actually nothing to save.
        if (changeArgs.args.propertyName !== 'Id') {
            save();
        }
    }

    function purge() {
        return dataservice.purge(getTodos);
    }

    function reset() {
        return dataservice.reset(getTodos);
    }

    function save(force) {
        // Save if have changes to save AND
        // if must save OR save not suspended
        if (dataservice.hasChanges() && (force || !suspendSave)) {
            return dataservice.saveChanges();
        }
        // Decided not to save; return resolved promise w/ no result
        return Q(false);
    }
});