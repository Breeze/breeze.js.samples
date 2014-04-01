/*
 * datacontext servicee encapsulates data access and model definition
 */
(function (){

    angular.module('app').factory('datacontext',
        ['$log', 'breeze','entityManagerFactory', factory]);

    function factory($log, breeze, entityManagerFactory){
        var addedState = breeze.EntityState.Added;
        var deletedState = breeze.EntityState.Deleted;
        var manager = entityManagerFactory.getEntityManager();
        manager.entityChanged.subscribe(entityCountsChanged);
        var todoItemType =manager.metadataStore.getEntityType('TodoItem');

        var datacontext = {
            addTodoItem:      addTodoItem,
            counts:           {},
            deleteTodoItem:   deleteTodoItem,
            getAllTodoItems:  getAllTodoItems,
            hasChanges:       hasChanges,
            reset:            reset,
            sync:             sync
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

        function getAllTodoItems() {
            return breeze.EntityQuery.from('TodoItem')
                .using(manager).execute().then(success).catch(handleError);

            function success(data){
                var fetched = data.results;
                $log.log('breeze query succeeded; count = '+ fetched.length);
                // Normally ok to just return fetched but this excludes new and deleted items
                // Therefore we build results from all cached entities including those just fetched
                // and purge deleted/unchanged that are no longer on the server
                var cached = manager.getEntities(todoItemType);
                var results=[];
                cached.forEach(function (ce){
                    var notFound = fetched.indexOf(ce) === -1;
                    if (notFound){
                        var state = ce.entityAspect.entityState;
                        if ( state.isUnchanged() || state.isDeleted() ){
                            // it's no longer on the server, remove it
                            ce.entityAspect.setDetached();
                            return; // don't include in results
                        }
                    }
                    results.push(ce);
                });
                return results;
            }
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

        function sync(){
            return manager.saveChanges()
                .then(function (){
                    $log.log('breeze save succeeded');
                    return getAllTodoItems();
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
