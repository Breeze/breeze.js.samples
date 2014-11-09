/*
 * Server delivers a new Breeze EntityManager on request.
 *
 * During service initialization:
 * - configures Breeze for use by this app
 * - gets entity metadata and sets up the client entity model
 * - configures the app to call the server during service initialization
 */
(function(angular) {
    'use strict';

    angular.module("app").factory( 'entityManagerFactory',
        ['breeze', 'config', 'model', factory] );

    function factory( breeze, config, model ) {
        var dataService, masterManager, metadataStore, service;

        configureBreezeForThisApp();
        metadataStore = getMetadataStore();

        service =  {
            getManager: getManager, // get the "master manager", creating if necessary
            newManager: newManager  // creates a new manager, not the "master manager"
        };
        return service;
        /////////////////////

        function configureBreezeForThisApp() {
            breeze.config.initializeAdapterInstance("dataService", "mongo", true);
            initBreezeAjaxAdapter(config.userSessionId);
            dataService = new breeze.DataService({ serviceName: config.serviceName })
        }

        // get the "master manager", creating it if necessary
        function getManager(){
            return masterManager || (masterManager = service.newManager());
        }

        function getMetadataStore() {
            // get the metadataStore for the Zza entity model
            // and associate it with the app's Node 'dataService'
            var store = model.getMetadataStore();
            store.addDataService(dataService);
            return store;
        }

        function initBreezeAjaxAdapter(userSessionId) {
            // get the current default Breeze AJAX adapter
            var ajaxAdapter = breeze.config.getAdapterInstance("ajax");
            ajaxAdapter.defaultSettings = {
                headers: {
                    "X-UserSessionId": userSessionId
                },
                timeout: config.httpTimeout || 10000
            };
        }

        // create a new manager, not the "master manager"
        function newManager() {
            return new breeze.EntityManager({
                dataService: dataService,
                metadataStore: metadataStore
            });
        }
    }
}( this.angular ));
