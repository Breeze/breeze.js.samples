(function( define ) {
    "use strict";

    define( [ ], function( ) {

        function entityManagerFactory( breeze, metadata, config, model )
        {
            var serviceName = config.serviceName;
            var metadataStore = getMetadataStore();

            // configure Breeze for this app
            breeze.config.initializeAdapterInstance("dataService", "mongo", true);

            initBreezeAjaxAdapter(config.userSessionId);
            setNamingConvention();


            return {
                newManager: newManager
            };

            // *********************************************************
            // Private methods
            // *********************************************************

            function getMetadataStore() {
                var store = new breeze.MetadataStore();

                // Import metadata that were downloaded as a script file
                if (! metadata )   {
                    throw new Error("'metadata' is not defined; was metadata.js loaded?");
                }
                // Because of Breeze bug, must stringify metadata first.
                store.importMetadata(JSON.stringify( metadata ));

                // Associate these metadata data with the service
                // if not already associated
                if (!store.hasMetadataFor(serviceName))   {
                    store.addDataService(
                        new breeze.DataService({ serviceName: serviceName }));
                }

                model.configureMetadataStore(store);

                return store;
            }

            function newManager() {
                var mgr = new breeze.EntityManager({
                    serviceName: serviceName,
                    metadataStore: metadataStore
                });
                mgr.enableSaveQueuing(true);
                return mgr;
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

            function setNamingConvention() {
                // Translate certain zza property names between MongoDb names and client names
                var convention = new breeze.NamingConvention({
                    serverPropertyNameToClient: function(serverPropertyName) {
                        switch (serverPropertyName) {
                            case '_id':   return 'id';
                            case 'qty':   return 'quantity';
                            case 'optionId':   return 'productOptionId';
                            case 'sizeId':   return 'productSizeId';
                            case 'items':   return 'orderItems';
                            case 'options':   return 'orderItemOptions';
                            default: return serverPropertyName;
                        }
                    },
                    clientPropertyNameToServer: function(clientPropertyName) {
                        switch (clientPropertyName) {
                            case 'id':   return '_id';
                            case 'quantity':   return 'qty';
                            case 'productOptionId':   return 'optionId';
                            case 'productSizeId':   return 'sizeId';
                            case 'orderItems':   return 'items';
                            case 'orderItemOptions':   return 'options';
                            default: return clientPropertyName;
                        }
                    }
                });
                convention.setAsDefault();
            }
        };

        // Register as global constructor function
        return [ 'breeze', 'metadata', 'config', 'model', entityManagerFactory ];

    });

}( this.define ));
