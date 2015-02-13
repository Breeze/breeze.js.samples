/*
 * Breeze Labs Abstract REST DataServiceAdapter
 *
 *  v.0.6.3
 *
 * Extends Breeze with a REST DataService Adapter abstract type
 *
 * N.B.: This adapter CANNOT be used directly!
 *
 * It's a base type for concrete REST adapters such as the SharePoint OData DataService Adapter
 * and the Azure Mobile Services adapter
 *
 * A concrete REST adapter
 *
 * - MUST replace the _createChangeRequest with a concrete implementation to enable save
 *
 * - SHOULD replace the "noop" JsonResultsAdapter.
 *
 * - WILL LIKELY replace the executeQuery method.
 *
 * - COULD replace the fetchMetadata method and MUST do so if getting metadata from the server.
 *
 * - MAY replace any of the protected members prefixed by '_'.
 *
 * FOR EXAMPLE IMPLEMENTATION, SEE breeze.labs.dataservice.sharepoint.js
 *
 * By default this adapter permits multiple entities to be saved at a time,
 * each in a separate request that this adapter fires off in parallel.
 * and waits for all to complete.
 *
 * If 'saveOnlyOne' == true, the adapter throws an exception
 * when asked to save more than one entity at a time.
 *
 * Copyright 2015 IdeaBlade, Inc.  All Rights Reserved.
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Authors: Ward Bell
 */
(function (definition) {
    if (typeof breeze === "object") {
        definition(breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node
        var b = require('breeze');
        definition(b);
    } else if (typeof define === "function" && define["amd"]) {
        // Requirejs / AMD
        define(['breeze'], definition);
    } else {
        throw new Error("Can't find breeze");
    }
}(function (breeze) {
    "use strict";

    var ctor = function () { };

    breeze.AbstractRestDataServiceAdapter = ctor;

    // borrow from the AbstractDataServiceAdapter
    var abstractDsaProto = breeze.AbstractDataServiceAdapter.prototype;

    ctor.prototype = {

        // Breeze DataService API
        executeQuery: executeQuery,
        fetchMetadata: fetchMetadata,
        initialize: initialize,
        saveChanges: saveChanges,

        // Configuration API
        changeRequestInterceptor: abstractDsaProto.changeRequestInterceptor, // default, no-op ctor
        checkForRecomposition: checkForRecomposition,
        saveOnlyOne: false, // true if may only save one entity at a time.
        ignoreDeleteNotFound: true, // true if should ignore a 404 error from a delete

        // "protected" members available to derived concrete dataservice adapter types
        _addToSaveContext: _addToSaveContext,
        _addKeyMapping: _addKeyMapping,
        _ajaxImpl: undefined, // see initialize()
        _catchNoConnectionError: abstractDsaProto._catchNoConnectionError,
        _createChangeRequestInterceptor: abstractDsaProto._createChangeRequestInterceptor,
        _changeRequestSucceeded: _changeRequestSucceeded,
        _createErrorFromResponse: _createErrorFromResponse,
        _createChangeRequest: _createChangeRequest,
        _createJsonResultsAdapter: _createJsonResultsAdapter,
        _clientTypeNameToServer: _clientTypeNameToServer,
        _getEntityTypeFromMappingContext: _getEntityTypeFromMappingContext,
        _getNodeEntityType: _getNodeEntityType,
        _getResponseData: _getResponseData,
        _processSavedEntity: _processSavedEntity,
        _serializeToJson: _serializeToJson, // serialize raw entity data to JSON for save
        _serverTypeNameToClient: _serverTypeNameToClient,
        _transformSaveValue: _transformSaveValue
    };

    /*** Breeze DataService API ***/

    function initialize() {
        var adapter = this;
        var ajaxImpl = adapter._ajaxImpl = breeze.config.getAdapterInstance("ajax");

        if (!ajaxImpl) {
            throw new Error("Unable to initialize ajax for " + adapter.name);
        }

        var ajax = ajaxImpl.ajax;
        if (!ajax) {
            throw new Error("Breeze was unable to find an 'ajax' adapter for " + adapter.name);
        }

        adapter.Q = breeze.Q; // adapter.Q is for backward compat

        if (!adapter.jsonResultsAdapter) {
            adapter.jsonResultsAdapter = adapter._createJsonResultsAdapter();
        }
    }

    function checkForRecomposition(interfaceInitializedArgs) {
        if (interfaceInitializedArgs.interfaceName === "ajax" && interfaceInitializedArgs.isDefault) {
            this.initialize();
        }
    }

    function executeQuery(mappingContext) {
        var adapter = mappingContext.adapter = this;
        var deferred = adapter.Q.defer();
        var url = mappingContext.getUrl();
        var headers = {
            'Accept': 'application/json'
        };

        adapter._ajaxImpl.ajax({
            type: "GET",
            url: url,
            headers: headers,
            params: mappingContext.query.parameters,
            success: querySuccess,
            error: function (response) {
                deferred.reject(adapter._createErrorFromResponse(response, url, mappingContext));
            }
        });
        return deferred.promise;

        function querySuccess(response) {
            try {
                var rData = {
                    results: adapter._getResponseData(response).results,
                    httpResponse: response
                };
                deferred.resolve(rData);
            } catch (e) {
                // program error means adapter it broken, not SP or the user
                deferred.reject(new Error("Program error: failed while parsing successful query response"));
            }
        }
    }

    function fetchMetadata() {
        throw new Error("Cannot process server metadata; create your own and use that instead");
    }

    function saveChanges(saveContext, saveBundle) {
        var adapter = saveContext.adapter = this;
        var Q = adapter.Q;

        try {
            if (adapter.saveOnlyOne && saveBundle.entities.length > 1) {
                return Q.reject(new Error("Only one entity may be saved at a time."));
            }
            adapter._addToSaveContext(saveContext);

            var requests = createChangeRequests(saveContext, saveBundle);
            var promises = sendChangeRequests(saveContext, requests);
            var comboPromise = Q.all(promises);
            return comboPromise
                .then(reviewSaveResult)
                .then(null, saveFailed);

        } catch (err) {
            return Q.reject(err);
        }

        function reviewSaveResult(/* promiseValues */) {
            var saveResult = saveContext.saveResult;
            var entitiesWithErrors = saveResult.entitiesWithErrors;
            var errorCount = entitiesWithErrors.length;
            if (!errorCount) { return saveResult; }  // all good

            // at least one request failed; process those that succeeded
            saveContext.processSavedEntities(saveResult);

            var error;
            // Compose error; promote the first error when one or all fail
            if (requests.length === 1 || requests.length === errorCount) {
                // When all fail, good chance the first error is the same reason for all
                error = entitiesWithErrors[0].error;
            } else {
                error = new Error("\n The save failed although some entities were saved.");
            }
            error.message = (error.message || "Save failed") +
                "  \n See 'error.saveResult' for more details.\n";
            error.saveResult = saveResult;
            return Q.reject(error);
        }

        function saveFailed(error) {
            return Q.reject(error);
        }
    }

    /*** Members a derived Type might use or replace ***/

    function _addToSaveContext(/* saveContext */) { }

    function _addKeyMapping(saveContext, index, saved){
        var tempKey = saveContext.tempKeys[index];
        if (tempKey) {
            // entity had a temporary key; add a temp-to-perm key mapping
            var entityType = tempKey.entityType;
            var tempValue = tempKey.values[0];
            var realKey = getRealKey(entityType, saved);
            var keyMapping = {
                entityTypeName: entityType.name,
                tempValue: tempValue,
                realValue: realKey.values[0]
            };
            saveContext.saveResult.keyMappings.push(keyMapping);
        }
    }

    function _clientTypeNameToServer(typeName) {
        var jrAdapter = this.jsonResultsAdapter;
        return jrAdapter.clientTypeNameToServer ?
            jrAdapter.clientTypeNameToServer(typeName) : typeName;
    }

    function _createChangeRequest(/* saveContext, entity, index */) {
        throw new Error("Need a concrete implementation of _createChangeRequest");
    }

    // Create error object for both query and save responses.
    // A method on the adapter (`this`)
    // 'context' can help differentiate query and save
    // 'errorEntity' only defined for save response
    function _createErrorFromResponse(response, url, context, errorEntity) {
        var err = new Error();
        err.response = response;
        if (url) { err.url = url; }
        err.status =  response.status || '???';
        err.statusText = response.statusText;
        err.message =  response.message || response.error || response.statusText;
        this.catchNoConnectionError(err);
        return err;
    }

    function _createJsonResultsAdapter(/*dataServiceAdapter*/) {
        return new breeze.JsonResultsAdapter({
            name: "noop",
            visitNode: function (/*node, mappingContext, nodeContext*/) {
                return {};
            }

        });
    }

    function _getEntityTypeFromMappingContext(mappingContext) {
        var query = mappingContext.query;
        if (!query) {return null;}
        var entityType = query.entityType || query.resultEntityType;
        if (!entityType) { // try to figure it out from the query.resourceName
            var metadataStore = mappingContext.metadataStore;
            var etName = metadataStore.getEntityTypeNameForResourceName(query.resourceName);
            if (etName) {
                entityType = metadataStore.getEntityType(etName);
            }
        }
        return entityType;
    }

    function _getNodeEntityType(mappingContext, typeName) {
        // Get the EntityType corresponding to the typeName
        // A utility for implementation of jsonResultsAdapter.visitNode
        // typeName: a string on the node that identifies the type of the raw data
        //
        // This method memoizes the type names it encounters
        // by adding a 'typeMap' object to the JsonResultsAdapter.
        if (!typeName) { return undefined; }

        var jsonResultsAdapter = mappingContext.jsonResultsAdapter;
        var typeMap = jsonResultsAdapter.typeMap;
        if (!typeMap) { // if missing, make one with a fallback mapping
            typeMap = { "": { _mappedPropertiesCount: NaN } };
            jsonResultsAdapter.typeMap = typeMap;
        }

        var entityType = typeMap[typeName]; // EntityType for a node with this metadata.type

        if (!entityType) {
            // Haven't see this typeName before; add it to the typeMap
            // Figure out what EntityType this is and remember it
            entityType = mappingContext.metadataStore.getEntityType(typeName, true);
            typeMap[typeName] = entityType || typeMap[""];
        }
        return entityType;
    }

    function _getResponseData(response) {
        return response.data;
    }

    function _processSavedEntity(/*savedEntity, response, saveContext, index*/){
        // Virtual method. Override in concrete adapter if needed.
    }

    function _serializeToJson(rawEntityData) {
        // Serialize raw entity data to JSON during save
        // You could override this default version
        // Note that DataJS has an amazingly complex set of tricks for this,
        // all of them depending on metadata attached to the property values
        // which breeze entity data never have.
        return JSON.stringify(rawEntityData);
    }

    function _serverTypeNameToClient(mappingContext, typeName) {
        var jrAdapter = mappingContext.jsonResultsAdapter;
        return jrAdapter.serverTypeNameToClient ?
            jrAdapter.serverTypeNameToClient(typeName) : typeName;
    }

    function _transformSaveValue(prop, val) {
        // prepare a property value for save by transforming it
        if (prop.isUnmapped) { return undefined; }
        if (prop.dataType === breeze.DataType.DateTimeOffset) {
            // The datajs lib tries to treat client dateTimes that are defined as DateTimeOffset on the server differently
            // from other dateTimes. This fix compensates before the save.
            // TODO: If not using datajs (and this adapter doesn't) is this necessary?
            val = val && new Date(val.getTime() - (val.getTimezoneOffset() * 60000));
        } else if (prop.dataType.quoteJsonOData) {
            val = val != null ? val.toString() : val;
        }
        return val;
    }

    /*** private members ***/

    function createChangeRequests(saveContext, saveBundle) {
        var adapter = saveContext.adapter;
        var originalEntities = saveContext.originalEntities = saveBundle.entities;
        saveContext.tempKeys = [];

        var changeRequestInterceptor =
            adapter._createChangeRequestInterceptor(saveContext, saveBundle);

        var requests = originalEntities.map(function (entity, index) {
            var request = adapter._createChangeRequest(saveContext, entity, index);
            return changeRequestInterceptor.getRequest(request, entity, index);
        });
        changeRequestInterceptor.done(requests);
        return requests;
    }

    function getRealKey(entityType, rawEntity) {
        return entityType.getEntityKeyFromRawEntity(rawEntity,
            breeze.DataProperty.getRawValueFromServer);
    }

    function sendChangeRequests(saveContext, requests) {
        // Sends each prepared save request and processes the promised results
        // returns a single "comboPromise" that waits for the individual promises to complete
        // Todo: What happens when there are a gazillion async requests?

        var saveResult = {
            entities: [],
            entitiesWithErrors: [],
            keyMappings: []
        };
        saveContext.saveResult = saveResult;

        return requests.map(function (request, index) {
            return sendChangeRequest(saveContext, request, index);
        });
    }

    function sendChangeRequest(saveContext, request, index) {
        var adapter = saveContext.adapter;
        var deferred = adapter.Q.defer();
        var url = request.requestUri;
        adapter._ajaxImpl.ajax({
            url: url,
            type: request.method,
            headers: request.headers,
            data: request.data,
            success: tryRequestSucceeded,
            error: tryRequestFailed
        });

        return deferred.promise;

        function tryRequestSucceeded(response) {
            try {
                var status = +response.status;
                if ((!status) || status >= 400) {
                    tryRequestFailed(response);
                } else {
                    var savedEntity = adapter._changeRequestSucceeded(saveContext, response, index);
                    adapter._processSavedEntity(savedEntity, response, saveContext, index);
                    deferred.resolve(true);
                }
            } catch (e) {
                // program error means adapter is broken, not remote server or the user
                deferred.reject("Program error: failed while processing successful save response");
            }
        }

        function tryRequestFailed(response) {
            try {
                var status = +response.status;
                if (status && status === 404 && adapter.ignoreDeleteNotFound &&
                    saveContext.originalEntities[index].entityAspect.entityState.isDeleted()) {
                    // deleted entity not found; treat as if successfully deleted.
                    response.status = 204;
                    response.statusText = 'resource was already deleted; no content';
                    response.data = undefined;
                    tryRequestSucceeded(response);
                } else {
                    // Do NOT fail saveChanges at the request level
                    var errorEntity = saveContext.originalEntities[index];
                    saveContext.saveResult.entitiesWithErrors.push({
                        entity: errorEntity,
                        error: adapter._createErrorFromResponse(response, url, saveContext, errorEntity)
                    });
                    deferred.resolve(false);
                }
            } catch (e) {
                // program error means adapter is broken, not remote server or the user
                deferred.reject("Program error: failed while processing save error");
            }
        }
    }

    function _changeRequestSucceeded(saveContext, response, index) {
        var saved = saveContext.adapter._getResponseData(response);
        if (saved && typeof saved === 'object') {
            // Have "saved entity" data; add its type (for JsonResultsAdapter) & KeyMapping
            saved.$entityType = saveContext.originalEntities[index].entityType;
            saveContext.adapter._addKeyMapping(saveContext, index, saved);
        } else {
            // No "saved entity" data; return the original entity
            saved = saveContext.originalEntities[index];
        }
        saveContext.saveResult.entities.push(saved);
        return saved;
    }

}));