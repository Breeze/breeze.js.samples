/*
 * datacontext servicee encapsulates data access and model definition
 */
(function (){

    angular.module('app').factory('datacontext',
        ['$log', 'breeze','entityManagerFactory', factory]);

    function factory($log, breeze, entityManagerFactory){
        var manager = entityManagerFactory.getEntityManager();
        manager.entityChanged.subscribe(entityCountsChanged);
        var todoItemType =manager.metadataStore.getEntityType('TodoItem');

        var datacontext = {
            addTodoItem:      addTodoItem,
            counts:           {},
            deleteTodoItem:   deleteTodoItem,
            getTodoItems:     getTodoItems,
            hasChanges:       hasChanges,
            reset:            reset,
            save:             save
        };
        updateCounts();
        return datacontext;
        /////////////////////////////

        function addTodoItem(initialValues){
            return manager.createEntity(todoItemType, initialValues);
        }

        function deleteTodoItem(todoItem){
            var aspect = todoItem.entityAspect;
            if (aspect.entityState !== breeze.EntityState.Detached){
                aspect.setDeleted();
            }
        }

        function entityCountsChanged(changeArgs){
            var action = changeArgs.entityAction;
            if (action !== breeze.EntityAction.PropertyChange){
                updateCounts();
            }
        }

        // Includes deleted todoItems
        function getCachedTodoItems(){
            return manager.getEntities(todoItemType);
        }

        function getTodoItems(includeComplete) {
            var query = breeze.EntityQuery.from('TodoItem');
            if (typeof includeComplete === 'boolean'){
                query = query.where('complete', 'eq', includeComplete);
            }

            return manager.executeQuery(query)
                .then(function (data){
                    $log.log('breeze query succeeded');
                    // return data.results; // normally ok but excludes deleted items so do this instead
                    return getCachedTodoItems();
                }, handleError);
        }

        function handleError(error) {
            var status = error.status ? error.status + ' - ' : '';
            var err = status + (error.message ? error.message : 'unknown error; check console.log');
            throw new Error(err); // so downstream listener gets it.
        }

        function hasChanges(){
            return manager.hasChanges();
        }

        function reset(){ /* not implemented yet */}

        function save(){
            return manager.saveChanges()
                .then(function (){
                    $log.log('breeze save succeeded');
                    return getCachedTodoItems();
                })
                .catch(handleError);
        }

        function updateCounts() {
            var counts = datacontext.counts;
            counts.all = 0;
            counts.Added = 0;
            counts.Deleted = 0;
            counts.Modified = 0;
            counts.Unchanged = 0;
            manager.getEntities().forEach(countIt);

            function countIt(entity){
                var state = entity.entityAspect.entityState.name;
                counts[state] += 1;
                counts.all += 1;
            }
        }
    }
})();
