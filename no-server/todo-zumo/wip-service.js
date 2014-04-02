/*
 * wip ("Work in Progress") service stashes changed entities in browser local storage.
 * This simple version works for one EntityManager only and automatically captures changes
 * to that manager in a throttled way.
 */
(function (){

    angular.module('app').factory('wip-service',
        ['$log','$rootScope','$timeout','$window', 'breeze', service]);

    function service($log, $rootScope, $timeout, $window, breeze){

        var wip = {
            clear: clearWip,
            eventName: function() {return eventName;},
            initialize: initialize,
            isEnabled: function(){return !disabled;},
            isStopped: function(){return !!stopped;},
            restore: false,
            resume: resume,
            stop: stop
        };

        var db = $window.localStorage;

        var delay = 5000; // debounce for 5 seconds
        var disabled = undefined;
        var entityChangedToken = undefined;
        var eventName = "WIP";
        var isRestoring = false;
        var manager = undefined;
        var propChangeAction = breeze.PropertyChange;
        var priorTimeout = undefined;
        var stashName = "wip";
        var stashTypes = [];
        var stopped = false;

        return wip;
        ///////////////////////
        function clearWip(){
            if (disabled) {return;}
            try {
               db.removeItem(stashName);
               sendWipMessage('Cleared WIP stash');
            } catch(e) {/* doesn't matter */}
        }

        function entityChanged(changeArgs){
            if (isRestoring || stopped) {return;} // ignore WIP service's own changes.
            var action = changeArgs.action;
            if (action === propChangeAction ){
                $timeout.cancel(priorTimeout);
                priorTimeout = $timeout(stash, delay, true);
            }
        }

        function initialize(entityManager, typesToStash){
            if (typeof disabled === 'boolean') {
                throw new Error("WIP already enabled, can't enable twice.");
            }
            if (!db){
                disabled = true;
                $log.error("Browser does not support local storage; WIP disabled.")
            } else {
                manager = entityManager;
                setStashTypes(typesToStash);
                listenForChanges();
                disabled = false;
                $log.log('WIP enabled');
            }
        }

        function listenForChanges(){
            if (entityChangedToken) { return; } // already listening
            entityChangedToken = manager.entityChanged.subscribe(entityChanged);
            disabled = false;
        }

        function restore(){
            if (disabled) {return;}
            // imports changes from stash
            isRestoring = true;
            try {
                var changes = db.getItem(stashName);
                if (changes){
                    // should confirm that metadata and app version are still valid but this is a demo
                    var imports = manager.importEntities(changes);
                    sendWipMessage('Restoring '+imports.length+' change(s) from WIP');
                }
            } catch (error){
                $log.error('WIP restore failed');
                $log.error(error);
            } finally {
                isRestoring = false;
            }
        }

        function resume(){
            if (disabled) {return;}
            stash();
            listenForChanges();
            sendWipMessage('WIP re-enabled');
            stopped = false;
        }

        function sendWipMessage(message){
            $log.log('WIP message sent "'+message+'"');
            $rootScope.$broadcast(eventName, message);
        }

        function setStashTypes(typesToStash){
            var metadataStore = manager.metadataStore;
            stashTypes = (Array.isArray(typesToStash) ? typesToStash : [typesToStash]).slice();
            stashTypes.forEach(function(typeName, i){
                if (typeof typeName === 'string'){
                    var type = metadataStore.getEntityType(typeName, true);
                    if (!type){
                        throw new Error("Invalid typename passed to WIP.initialize: "+typeName)
                    }
                    stashTypes[i] = type;
                }
            })
        }

        function stash(){
            if (manager.hasChanges()){
                // export changes w/o metadata
                var changes = manager.getChanges(stashTypes);
                sendWipMessage('Stashing '+changes.length+' change(s) in WIP stash');
                var exported = manager.exportEntities(changes, false);
                // should stash with metadata and app version but this is a demo
                db.setItem(stashName, exported);
            } else {
                sendWipMessage('No changes; clearing WIP stash');
                db.removeItem(stashName);
            }

        }

        function stop(){
            if (disabled) {return;}
            stopListeningForChanges();
            sendWipMessage('WIP has been stopped');
            stopped = true;
        }

        function stopListeningForChanges() {
            manager.entityChanged.unsubscribe(entityChangedToken);
            entityChangedToken = undefined;
        }
    }
})();