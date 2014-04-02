/*
 * datacontext service encapsulates data access and model definition
 */
(function (){

    angular.module('app').factory('datacontext',
        ['$log', 'breeze','entityManagerFactory', 'wip-service', service]);

    function service($log, breeze, entityManagerFactory, wip){
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
            loadTodoItems:    loadTodoItems,
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

        // Get all TodoItems from the server and cache and purge
        // unmodified or deleted cached entities that aren't on the server
        function getAllTodoItems() {
            return breeze.EntityQuery.from('TodoItem')
                .using(manager).execute().then(success).catch(handleError);

            function success(data){
                var fetched = data.results;
                $log.log('breeze query succeeded; count = '+ fetched.length);
                // Fetched lacks new and deleted items and entities others deleted may be in cache
                // Therefore we build results from all cached entities including those just fetched
                // and purge deleted/unchanged that are no longer on the server
                var cached = manager.getEntities(todoItemType);
                var results=[];
                cached.forEach(function (ce){
                    // WARNING: DEMO CODE. ridiculously slow when 'fetched' is large
                    if (fetched.indexOf(ce) === -1){  // cached entity not in fetched
                        var state = ce.entityAspect.entityState;
                        if ( state.isUnchanged() || state.isDeleted() ){
                            // remove from cache and exclude from results
                            ce.entityAspect.setDetached();
                        } else {
                            results.push(ce); // keep new and modified
                        }
                    } else { // cached entity is in fetched; keep it
                        results.push(ce);
                    }
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

        // Load cache at app start from server and wip stash.
        // Unlike getAllTodoItems, it does not purge cache of dead wood
        function loadTodoItems(){
            var restored = wip.restore();
            return breeze.EntityQuery.from('TodoItem')
                .using(manager).execute().then(success).catch(handleError);
            function success(data) {
                var loaded = data.results;
                $log.log('breeze load succeeded; fetch count = ' + loaded.length);
                if (restored && restored.length > 0) {
                   // get from cache so we are sure to include 'new' entities.
                    loaded = manager.getEntities(todoItemType);
                }
                return loaded;
            }
        }

        // Clear everything local and reload from server.
        function reset(){
            wip.stop();
            wip.clear();
            manager.clear();
            return loadTodoItems()
                .finally(function(){wip.resume();});
        }

        function sync(){
            return manager.saveChanges()
                .then(function (){
                    $log.log('breeze save succeeded');
                    wip.clear();
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
