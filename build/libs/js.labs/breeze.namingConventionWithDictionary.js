//#region Copyright, Version, and Description
/*
 *
 * NamingConventionWithDictionary plugin to the breeze.NamingConvention class
 *
 * Adds a NamingConvention that extends another NamingConvention
 * by attempting first to translate specific Entity property names using a dictionary.
 * If a property name is not found in the dictionary,
 * it falls back to the base NamingConvention (AKA "sourceNamingConvention").
 *
 * Copyright 2015 IdeaBlade, Inc.  All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Ward Bell
 * Version: 0.1.0 - original
 *
 * Load this script after breeze
 *
 * Usage:
 *    var convention =
 *      new breeze.NamingConvention.NamingConventionWithDictionary(...)
 *
 */
//#endregion
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
    'use strict';
    breeze.NamingConvention.NamingConventionWithDictionary = NamingConventionWithDictionary;

/**
  NamingConvention that extends another {{#crossLink "NamingConvention"}}{{/crossLink}}
  by attempting first to translate specific Entity property names using a dictionary.
  If a property name is not found in the dictionary,
  it falls back to the base NamingConvention (AKA "sourceNamingConvention").

  @class NamingConventionWithDictionary
  **/

  /**
  NamingConventionWithDictionary constructor
  @example
    var clientToServerDictionary = {
      'Customer:#Northwind.Models': {customerName: 'CompanyName', zip: 'PostalCode'},
      'Order:#Northwind.Models':    {freightCost: 'Freight'},
      undefined: {foo: 'Bar'}  // translation for expected anonymous type property
    };

    var convention = new breeze.NamingConvention.NamingConventionWithDictionary(
      'northwind', breeze.NamingConvention.camelCase, clientToServerDictionary);

    convention.setAsDefault(); // make it the default for the entire app

  @method <ctor> NamingConventionWithDictionary
  @param name {String}
  @param sourceNamingConvention {Function} {{#crossLink "NamingConvention"}}{{/crossLink}} base class
  @param clientToServerDictionary {Object} Hash of EntityType names with inner hash of client-to-server key/value pairs
  */
  function NamingConventionWithDictionary(name, sourceConvention, clientToServerDictionary) {
    breeze.core.assertParam(name, 'name').isNonEmptyString().check();
    breeze.core.assertParam(sourceConvention, 'sourceConvention').isInstanceOf(breeze.NamingConvention).check();
    breeze.core.assertParam(clientToServerDictionary, 'clientToServerDictionary').isObject().check();

    var serverToClientDictionary = makeServerToClientDictionary();

    return new breeze.NamingConvention({
      name: name,
      clientPropertyNameToServer: clientPropertyNameToServer,
      serverPropertyNameToClient: serverPropertyNameToClient
    });

    function clientPropertyNameToServer(name, propDef) {
        var typeName = propDef && propDef.parentType && propDef.parentType.name;
        var props = clientToServerDictionary[typeName || undefined];
        var newName = props && props[name];
        return newName || sourceConvention.clientPropertyNameToServer(name, propDef);
    }

    function serverPropertyNameToClient(name, propDef) {
      var typeName = propDef && propDef.parentType && propDef.parentType.name;
      var props = serverToClientDictionary[typeName || undefined];
      var newName = props && props[name];
      return newName || sourceConvention.serverPropertyNameToClient(name, propDef);
    }

    // makes new dictionary based on clientToServerDictionary
    // that reverses each EntityType's {clientPropName: serverPropName} KV pairs
    function makeServerToClientDictionary() {
      var dict = {};
      for (var typeName in clientToServerDictionary) {
        if (clientToServerDictionary.hasOwnProperty(typeName)) {
          var newType = {}
          var type = clientToServerDictionary[typeName];
          for (var prop in type) {
            if (type.hasOwnProperty(prop)) {
              newType[type[prop]] = prop; // reverse KV pair
            }
          }
          dict[typeName] = newType;
        }
      }
      return dict;
    }
  }

}));