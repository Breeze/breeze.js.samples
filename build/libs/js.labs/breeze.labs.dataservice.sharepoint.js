/*
 * Breeze Labs SharePoint 2013 & 2010 OData DataServiceAdapter
 *
 *  v.0.10.0
 *
 * SharePoint 2010 DataServiceAdapter name = SharePointOData2010
 * SharePoint 2013+ DataServiceAdapter name = SharePointOData
 *
 * Registers a SharePoint 2013 & 2010 OData DataServiceAdapter with Breeze
 *
 * REQUIRES breeze.labs.dataservice.abstractrest.js v.0.6.3+
 *
 * This adapter cannot get metadata from the server and in general one should
 * not do so because such metadata cover much more of than you want and are huge (>1MB)
 * Better to define the metadata "by hand" on the client.
 *
 * W/o need to get metadata, can use AJAX adapter instead of Data.JS.
 *
 * Typical usage in Angular
 *    // configure breeze to use SharePoint OData service
 *    var dsAdapter = breeze.config.initializeAdapterInstance('dataService', 'SharePointOData', true);
 *
 *    // provide method returning value for the SP OData 'X-RequestDigest' header
 *    dsAdapter.getRequestDigest = function(){return securityService.requestDigest}
 *    // note that the digest is NOT required if you are authenticating using OAuth tokens
 *    //  as the digest is only needed to protect against XSFR that involves cookies...
 *    //  when using OAuth tokens for authentication, cookies aren't used and thus XSFR is moot
 *
 * This adapter has its own JsonResultsAdapter which you could replace.
 *
 * The dataservice adapter looks for clientTypeNameToServer and serverTypeNameToClient methods
 * on the JsonResultsAdapter during transformation of entity data to/from the server
 * so it can convert server type names to client EntityType names.
 * These are initialized to the default versions defined here.
 * You can create and attach alternative type name conversion methods to the JsonResultsAdapter
 *
 * This adapter memorizes the type names it encounters
 * by adding a 'typeMap' object to the JsonResultsAdapter.
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
 * Authors: Ward Bell, Andrew Connell
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

  // register SharePoint 2013+ data service adapter
  var ctor = function () {
    this.name = "SharePointOData";
    this.dataServiceVersion = '3.0';
  };
  // Delay setting the prototype until we're sure AbstractRestDataServiceAdapter is loaded
  var proto = breeze.AbstractRestDataServiceAdapter.prototype;
  proto = breeze.core.extend(ctor.prototype, proto);
  proto.executeQuery = executeQuery;
  proto._addToSaveContext = _addToSaveContext;
  proto._clientTypeNameToServerDefault = clientTypeNameToServerDefault;
  proto._createChangeRequest = _createChangeRequest;
  proto._createErrorFromResponse = _createErrorFromResponse;
  proto._createJsonResultsAdapter = _createJsonResultsAdapter;
  proto._getResponseData = _getResponseData;
  proto._processSavedEntity = _processSavedEntity;
  proto._serverTypeNameToClientDefault = serverTypeNameToClientDefault;

  breeze.config.registerAdapter("dataService", ctor);
  // </> register SharePoint 2013+ data service adapter

  // register SharePoint 2010 data service adapter
  var ctor2010 = function Ctor2010() {
    this.name = "SharePointOData2010";
    this.dataServiceVersion = '2.0';
  };
  var proto2010 = breeze.core.extend(ctor2010.prototype, proto);
  proto2010._clientTypeNameToServerDefault = clientTypeNameToServer2010Default;
  proto2010._serverTypeNameToClientDefault = serverTypeNameToClient2010Default

  breeze.config.registerAdapter("dataService", ctor2010);
  // </> register SharePoint 2010 data service adapter

  ///////// implementation functions  //////////////////////////////////

  function _addToSaveContext(saveContext) {
    saveContext.requestDigest = this.getRequestDigest ? this.getRequestDigest() : null;
  }

  function applyDefaultSelect(mappingContext) {
    var query = mappingContext.query;
    var entityType = mappingContext.entityType;

    // get the default select if query lacks a select and
    // the result type is known and it has a defaultSelect
    var defaultSelect = !query.selectClause && entityType &&
        entityType.custom && entityType.custom.defaultSelect;
    if (defaultSelect) {
      // revise query with a new query that has the default select
      mappingContext.query = query.select(defaultSelect);
    }
  }

  function clientTypeNameToServerDefault(clientTypeName) {
    return 'SP.Data.' + clientTypeName + 'ListItem';
  }

  function clientTypeNameToServer2010Default(clientTypeName) {
    return 'Microsoft.SharePoint.DataService.' + clientTypeName + 'Item';
  }

  function _createChangeRequest(saveContext, entity, index) {
    var adapter = saveContext.adapter;
    var data, rawEntity, request;
    var entityManager = saveContext.entityManager;
    var helper = entityManager.helper;
    var tempKeys = saveContext.tempKeys;

    var aspect = entity.entityAspect;
    var state = aspect.entityState;
    var type = entity.entityType;
    var headers = {
      'Accept': 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose',
      'DataServiceVersion': adapter.dataServiceVersion
    };

    // conditionally include the digest if provided
    if (saveContext.requestDigest) {
      headers['X-RequestDigest'] = saveContext.requestDigest;
    }

    if (state.isAdded()) {
      var rn = type.defaultResourceName;
      if (!rn) {
        throw new Error("Missing defaultResourceName for type " + type.name);
      }
      if (type.autoGeneratedKeyType !== breeze.AutoGeneratedKeyType.None) {
        tempKeys[index] = aspect.getKey(); // DO NOT PUSH. Gaps expected!
      }

      rawEntity = helper.unwrapInstance(entity, adapter._transformSaveValue);
      rawEntity.__metadata = {
        'type': adapter._clientTypeNameToServer(type.shortName)
      };

      data = adapter._serializeToJson(rawEntity);
      request = {
        requestUri: entityManager.dataService.serviceName + rn,
        method: "POST",
        data: data
      };

    } else if (state.isDeleted()) {
      request = {
        method: "DELETE",
        data: null
      };
      adjustUpdateDeleteRequest();

    } else if (state.isModified()) {
      request = {
        method: "POST"
      };
      adjustUpdateDeleteRequest();
      headers['X-HTTP-Method'] = 'MERGE';
      rawEntity = helper.unwrapChangedValues(
          entity, entityManager.metadataStore, adapter._transformSaveValue);
      rawEntity.__metadata = { 'type': aspect.extraMetadata.type };
      request.data = adapter._serializeToJson(rawEntity);

    } else {
      throw new Error("Cannot save an entity whose EntityState is " + state.name);
    }

    request.headers = headers;

    return request;

    function adjustUpdateDeleteRequest() {
      var extraMetadata = aspect.extraMetadata;
      if (!extraMetadata) {
        throw new Error("Missing the extra metadata for an update/delete entity");
      }
      var uri = extraMetadata.uri || extraMetadata.id;
      request.requestUri = uri;
      if (extraMetadata.etag) {
        headers["If-Match"] = extraMetadata.etag;
      }
      return request;
    }
  }

  // Create error object for both query and save responses.
  // A method on the adapter (`this`)
  // 'context' can help differentiate query and save
  // 'errorEntity' only defined for save response
  function _createErrorFromResponse(response, url, context, errorEntity) {
    // OData errors can have the message buried very deeply - and nonobviously
    // this code is tricky so be careful changing the response.body parsing.
    var err = new Error();
    err.response = response;
    if (url) { err.url = url; }
    err.message = response.message || response.error || response.statusText;
    err.statusText = response.statusText;
    err.status = response.status;

    setSPODataErrorMessage(err);
    this._catchNoConnectionError(err);
    return err;
  }

  // TODO: relocate where re-usable?
  function setSPODataErrorMessage(err) {
    // OData errors can have the message buried very deeply - and nonobviously
    // Normal MS OData responses have a response.body
    // SharePoint OData responses have a response.data instead
    // this code is tricky so be careful changing the response.data parsing.
    var data = err.data = err.response.data,
        m,
        msg = [],
        nextErr;

    if (data) {
      try {
        if (typeof data === "string") {
          data = err.data = JSON.parse(data);
        }
        do {
          nextErr = data.error || data.innererror;
          if (!nextErr) {
            m = data.message || "";
            msg.push((typeof m === "string") ? m : m.value);
          }
          nextErr = nextErr || data.internalexception;
          data = nextErr;
        } while (nextErr);
        if (msg.length > 0) {
          err.message = msg.join('; ') + '.';
        }
      } catch (e) { /* carry on */ }
    }
  }

  function _createJsonResultsAdapter() {

    var dataServiceAdapter = this;
    var jsonResultsAdapter = new breeze.JsonResultsAdapter({
      name: dataServiceAdapter.name + "_default",
      visitNode: visitNode
    });

    jsonResultsAdapter.clientTypeNameToServer = dataServiceAdapter._clientTypeNameToServerDefault;
    jsonResultsAdapter.serverTypeNameToClient = dataServiceAdapter._serverTypeNameToClientDefault;

    return jsonResultsAdapter;

    function visitNode(node, mappingContext, nodeContext) {
      var result = { ignore: true };
      if (!node) { return result; }

      var propertyName = nodeContext.propertyName;
      var ignore = node.__deferred != null || propertyName === "__metadata" ||
            // EntityKey properties can be produced by EDMX models
          (propertyName === "EntityKey" && node.$type && core.stringStartsWith(node.$type, "System.Data"));

      if (!ignore) {
        result = {};
        updateEntityNode(node, mappingContext, result);

        // OData v3 - projection arrays will be enclosed in a results array
        if (node.results) {
          result.node = node.results;
        }
      }
      return result;
    }

    // Determine if this is an Entity node and update the node appropriately if so
    function updateEntityNode(node, mappingContext, result) {
      var metadata = node.__metadata;
      if (!metadata) { return; } // every SharePoint entity node has __metadata

      var entityType = node.$entityType;
      if (entityType) {
        // save result node
        result.entityType = entityType;
        result.extraMetadata = metadata;
        return;
      }

      // query node

      var typeName = dataServiceAdapter._serverTypeNameToClient(mappingContext, metadata.type);
      entityType = dataServiceAdapter._getNodeEntityType(mappingContext, typeName);

      if (entityType) {
        // ASSUME if #-of-properties on node is >= #-of-props for the type
        // that this is the full entity and not a partial projection.
        // Therefore we declare that we've received an entity
        if (entityType._mappedPropertiesCount <= Object.keys(node).length - 1) {
          result.entityType = entityType;
          result.extraMetadata = metadata;

          // Delete node properties that look like nested navigation paths
          // Breeze gets confused into thinking such properties contain actual entities.
          // Todo: rethink this if/when can include related entities through expand
          var navPropNames = entityType.navigationProperties.map(function (p) { return p.name; });
          navPropNames.forEach(function (n) { if (node[n]) { delete node[n]; } });
        }
      }
    }
  }

  function executeQuery(mappingContext) {
    var adapter = mappingContext.adapter = this;
    mappingContext.entityType = adapter._getEntityTypeFromMappingContext(mappingContext);
    applyDefaultSelect(mappingContext);
    var deferred = adapter.Q.defer();
    var url = mappingContext.getUrl();
    var headers = {
      'Accept': 'application/json;odata=verbose',
      'DataServiceVersion': adapter.dataServiceVersion
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
        var data = response.data;
        var inlineCount = data.__count ? parseInt(data.__count, 10) : undefined;
        var rData = {
          results: adapter._getResponseData(response).results,
          inlineCount: inlineCount,
          httpResponse: response
        };
        deferred.resolve(rData);
      } catch (e) {
        // program error means adapter it broken, not SP or the user
        deferred.reject(new Error("Program error: failed while parsing successful query response"));
      }
    }
  }

  function _getResponseData(response) {
    return response.data && response.data.d;
  }

  function _processSavedEntity(savedEntity, response /*, saveContext, index*/) {
    var etag = savedEntity && savedEntity.entityAspect && response.getHeaders('ETag');
    if (etag) {
      savedEntity.entityAspect.extraMetadata.etag = etag;
    }
  }

  function serverTypeNameToClientDefault(serverTypeName) {
    // strip off leading 'SP.Data.' and trailing 'ListItem'
    var re = /^(SP\.Data.)(.*)(ListItem)$/;
    var typeName = serverTypeName.replace(re, '$2');

    return breeze.MetadataStore.normalizeTypeName(typeName);
  }

  function serverTypeNameToClient2010Default(serverTypeName) {
    // strip off leading 'Microsoft.SharePoint.DataService.' and trailing 'Item'
    var regex = /^(Microsoft\.SharePoint\.DataService\.)(.*)(Item)$/;
    var typeName = serverTypeName.replace(regex, '$2');

    return breeze.MetadataStore.normalizeTypeName(typeName);
  }

}));