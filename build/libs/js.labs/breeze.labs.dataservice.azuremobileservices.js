/*
 * Breeze Labs Azure Mobile Services DataServiceAdapter
 *
 *  v.0.6.0
 *
 * Registers an Azure Mobile Services DataServiceAdapter with Breeze
 *
 * REQUIRES breeze.labs.dataservice.abstractrest.js v.0.6.0+
 *
 * This adapter cannot get metadata from the server because mobile services does not provide metadata.
 *
 * Typical usage in Angular
 *    // configure breeze to use Azure Mobile Services dataservice adapter
 *    var dsAdapter = breeze.config.initializeAdapterInstance('dataService', 'azure-mobile-services', true);
 *
 *    // provide the mobile services information specific to your app
 *    adapter.mobileServicesInfo = {
 *        url:          'https://yoursite.azure-mobile.net/',
 *        appKey:       'MumboJumboLwepMvaSSJdCAauHzhfddkQC33',    // identifies your app; it is not a secret
 *        installId:    '21463a76-e9fd-e429-13c6-a7a406a70505',    // if you know it, else creates one for you
 *        zumoVersion: 'ZUMO/1.0 (lang=Web; os=--; os_version=--; arch=--; version=1.0.11121.0)' // if you know it
 *    };
 *
 * This adapter has its own JsonResultsAdapter which you could replace.
 *
 * By default this adapter permits multiple entities to be saved at a time,
 * each in a separate request that this adapter fires off in parallel.
 * and waits for all to complete.
 *
 * If 'saveOnlyOne' == true, the adapter throws an exception
 * when asked to save more than one entity at a time.
 *
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Author: Ward Bell
 */
(function (definition, window) {
    if (window.breeze) {
        definition(window.breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node
        var b = require('breeze');
        definition(b);
    } else if (typeof define === "function" && define["amd"] && !window.breeze) {
        // Requirejs / AMD
        define(['breeze'], definition);
    } else {
        throw new Error("Can't find breeze");
    }
}(function (breeze) {
    "use strict";

    var ctor = function () {
        this.name = "azure-mobile-services";
    };
    ctor.prototype.initialize = typeInitialize;

    function typeInitialize() {
        // Delay setting the prototype until we're sure AbstractRestDataServiceAdapter is loaded
        var proto = breeze.AbstractRestDataServiceAdapter.prototype;
        proto = breeze.core.extend(ctor.prototype, proto);

        proto.executeQuery = executeQuery;

        proto._createErrorFromResponse = _createErrorFromResponse;
        proto._createChangeRequest = _createChangeRequest;
        proto._createJsonResultsAdapter = _createJsonResultsAdapter;
        proto._createUniqueInstallationId = _createUniqueInstallationId;
        proto._getZumoHeaders = _getZumoHeaders;

        this.initialize(); // the revised initialize()
    }

    breeze.config.registerAdapter("dataService", ctor);

    /////////////////
    // Create error object for both query and save responses.
    // 'context' can help differentiate query and save
    // 'errorEntity' only defined for save response
    function _createErrorFromResponse(response, url, context, errorEntity) {
        var err = new Error();
        err.response = response;
        var data = response.data || {};
        if (url) { err.url = url; }
        err.status =  data.code || response.status || '???';
        err.statusText = response.statusText || err.status;
        err.message =  data.error || response.message || response.error || err.statusText;
        proto._catchNoConnectionError(err);
        return err;
    }

    function _createJsonResultsAdapter() {

        var dataServiceAdapter = this;
        return new breeze.JsonResultsAdapter({
            name: dataServiceAdapter.name + "_default",
            visitNode: visitNode
        });

        function visitNode(node, mappingContext) {
            // mappingContext.entityType could be set for a queryResult
            // node.$entityType set when node is from a change response (see _processSavedEntity)
            var entityType =  mappingContext.entityType || node.$entityType ||
                dataServiceAdapter._getEntityTypeFromMappingContext(mappingContext);
            return (entityType) ? { entityType: entityType } : {}
        }
    }

    function _createChangeRequest(saveContext, entity, index) {
        var data, rawEntity, request;
        var type = entity.entityType;
        var rn = type.defaultResourceName;
        if (!rn) {
            throw new Error("Missing defaultResourceName for type " + type.name);
        }

        var adapter = saveContext.adapter;
        var entityManager = saveContext.entityManager;
        var helper = entityManager.helper;
        var baseUrl = entityManager.dataService.serviceName + rn;
        var tempKeys = saveContext.tempKeys;

        var aspect = entity.entityAspect;
        var key = aspect.getKey();
        var state = aspect.entityState;

        if (state.isAdded()) {
            if (type.autoGeneratedKeyType !== breeze.AutoGeneratedKeyType.None) {
                tempKeys[index] = key; // INDEX! DO NOT PUSH. Gaps expected!
            }
            rawEntity = helper.unwrapInstance(entity, adapter._transformSaveValue);
            // Don't send the temp key value or ZUMO will use it!
            // Delete that property so ZUMO generates a good permanent key
            delete rawEntity[type.keyProperties[0].name];
            data = adapter._serializeToJson(rawEntity);
            request = {
                requestUri: baseUrl,
                method: "POST",
                data: data
            };

        } else if (state.isModified()) {
            rawEntity = helper.unwrapChangedValues(entity, entityManager.metadataStore, adapter._transformSaveValue);
            data = adapter._serializeToJson(rawEntity);
            request = {
                requestUri: baseUrl+'/'+ key.values[0],
                method: "PATCH",
                data: data
            };

        } else if (state.isDeleted()) {
            request = {
                requestUri:  baseUrl+'/'+ key.values[0],
                method: "DELETE",
                data: null
            };

        } else {
            throw new Error("Cannot save an entity whose EntityState is " + state.name);
        }

        request.headers = adapter._getZumoHeaders();

        return request;
    }

    function _createUniqueInstallationId () {
        /// <summary>
        /// Create a unique identifier that can be used for the installation of
        /// the current application.
        /// </summary>
        /// <example>
        ///  '21463a76-e9fd-e429-13c6-a7a406a70505'
        /// </example>
        /// <returns type="String">Unique identifier.</returns>

        var pad4 = function (str) { return "0000".substring(str.length) + str; };
        var hex4 = function () { return pad4(Math.floor(Math.random() * 0x10000 /* 65536 */).toString(16)); };

        return (hex4() + hex4() + "-" + hex4() + "-" + hex4() + "-" + hex4() + "-" + hex4() + hex4() + hex4());
    }

    function _getZumoHeaders(){
        var msInfo = this.mobileServicesInfo;
        if (!msInfo.installId){
            msInfo.installId = _createUniqueInstallationId();
        }
        if (!msInfo.zumoVersion){
            msInfo.zumoVersion = 'ZUMO/1.0 (lang=Web; os=--; os_version=--; arch=--; version=1.0.11121.0)';
        }
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-ZUMO-APPLICATION': msInfo.appKey,
            'X-ZUMO-INSTALLATION-ID': msInfo.installId,
            'X-ZUMO-Version': msInfo.zumoVersion
        };
    }

    function executeQuery(mappingContext) {
        var adapter = this;
        mappingContext.entityType = adapter._getEntityTypeFromMappingContext(mappingContext);
        var deferred = adapter.Q.defer();
        var url = mappingContext.getUrl();//  + 'XXXX'; // deliberate fail
        var headers = adapter._getZumoHeaders();

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
                var data = response.data;
                var rData = {
                    results: data,
                    httpResponse: response
                };
                deferred.resolve(rData);
            } catch (e) {
                // program error means adapter it broken, not SP or the user
                deferred.reject(new Error("Program error: failed while parsing successful query response"));
            }
        }
    }

}, this));