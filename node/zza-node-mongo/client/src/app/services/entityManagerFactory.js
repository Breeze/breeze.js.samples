(function(angular) {
    'use strict';

   angular.module( "app" )
        .factory( 'entityManagerFactory', entityManagerFactory );

        // **************************************
        // Private construction function
        // **************************************

        function entityManagerFactory( breeze, metadata, config, model )
        {
            configureBreezeForThisApp();
            var serviceName = config.serviceName;
            var metadataStore = getMetadataStore();

            return {
                newManager: newManager
            };

            // *********************************************************
            // Private methods
            // *********************************************************

            function getMetadataStore() {
                var store = new breeze.MetadataStore();

                // Because of Breeze bug, must stringify metadata first.
                store.importMetadata(JSON.stringify( metadata ));

                // Associate these metadata data with this Node service
                if (!store.hasMetadataFor(serviceName))   { //if not already associated
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

            function configureBreezeForThisApp() {
                breeze.config.initializeAdapterInstance("dataService", "mongo", true);
                initBreezeAjaxAdapter(config.userSessionId);
                setNamingConvention();
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


}( this.angular ));
