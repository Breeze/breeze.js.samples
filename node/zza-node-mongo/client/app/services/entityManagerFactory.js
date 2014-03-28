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
        configureBreezeForThisApp();
        var serviceName = config.serviceName;
        var metadataStore = getMetadataStore();

        return {
            newManager: newManager
        };

        /* implementation */

        function getMetadataStore() {
            var metadataStore = new breeze.MetadataStore();

            // Associate these metadata data with this Node service
            metadataStore.addDataService(new breeze.DataService({ serviceName: serviceName }));

            // Extend model types with metadata, properties, and behavior
            model.addToMetadataStore(metadataStore);

            return metadataStore;
        }

        function newManager() {
            var mgr = new breeze.EntityManager({
                serviceName: serviceName,
                metadataStore: metadataStore
            });
            return mgr;
        }

        function configureBreezeForThisApp() {
            breeze.config.initializeAdapterInstance("dataService", "mongo", true);
            initBreezeAjaxAdapter(config.userSessionId);
        }

        function initBreezeAjaxAdapter(userSessionId) {
            // get the current default Breeze AJAX adapter
            var ajaxAdapter = breeze.config.getAdapterInstance("ajax");
            ajaxAdapter.defaultSettings = {
                headers: {
                    "X-UserSessionId": userSessionId
                }
            };
        }

    }

}( this.angular ));
