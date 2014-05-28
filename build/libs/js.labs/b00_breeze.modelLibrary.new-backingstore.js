/********************************************************
 * A Breeze Labs replacement for the "backingStore" model library
 * that facilitates testing by enabling reset of EntityType/ComplexType constructors.
 *
 * Based on b00_breeze.modelLibrary.backingstore.js
 *
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Ward Bell
 * Version: 0.8.1
 *
 * The Problem:
 * ------------
 * Breeze rewrites type properties to make them observable by Breeze and provide other
 * property interception logic. This isn't usually a problem in production where
 * a type's ctor is only registered once or if the ctor is actually a capture in a service.
 * But if the type is global (as TypeScript classes are) and you register the ctor repeatedly
 * as often happens in tests that create a new MetadataStore before each test,
 * you get an exception during registration because the global ctor is already bound
 * to the metadataStore created for the previous test.
 *
 * Solution:
 * ------------
 * Breeze is doing the right thing by patching the type ctor.
 * Too bad TypeScript makes the ctor global.
 * This model library keeps track of its changes to the ctor (and the prototype chain).
 * It adds a "__reset__" function to the ctor which you can call
 * between tests or whenever you recreate the MetadataStore and re-register the ctors.
 *
 * Install:
 * ------------
 * This adapter is a "drop in" replacement for the "backingStore" adapter
 * in Breeze core. It has the same adapter name so it will
 * silently replace the original "backingStore" adapter
 * when you load it as a script AFTER the breeze library.
 * To remove it, delete the file or rename the adapter
 * (in case you wish to include it conditionally in code, e.g., with
 *  breeze.config.initializeInstance('modelLibrary', 'new-backingStore', true);
 ******************************************************/
(function (factory) {
    if (breeze) {
        factory(breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    }
}(function(breeze) {
    "use strict";
    var core = breeze.core;

    var ctor = function() {
        this.name = "backingStore"; // replaces the Breeze core adapter with this name
    };
    ctor.prototype.initialize = function() {  };
    ctor.prototype.initializeEntityPrototype = initializeEntityPrototype;
    ctor.prototype.getTrackablePropertyNames = getTrackablePropertyNames;
    ctor.prototype.startTracking = startTracking;
////////////////////////////////////

    // This method is called during Metadata initialization
    function initializeEntityPrototype(proto) {

        proto.getProperty = function(propertyName) {
            return this[propertyName];
        };

        proto.setProperty = function (propertyName, value) {
            //if (!this._backingStore.hasOwnProperty(propertyName)) {
            //    throw new Error("Unknown property name:" + propertyName);
            //}
            this[propertyName] = value;
            // allow setProperty chaining.
            return this;
        };

        movePropDefsToProto(proto);
    }

    function getTrackablePropertyNames(entity) {
        var names = [];
        for (var p in entity) {
            if (p === "entityType") continue;
            if (p === "_$typeName") continue;
            if (p === "_pendingSets") continue;
            if (p === "_backingStore") continue;
            var val = entity[p];
            if (!core.isFunction(val)) {
                names.push(p);
            }
        }
        return names;
    }

    // This method is called when an EntityAspect is first created - this will occur as part of the entityType.createEntity call.
    // which can be called either directly or via standard query materialization
    // entity is either an entity or a complexObject
    function startTracking(entity /*, proto*/) {
        // can't touch the normal property sets within this method - access the backingStore directly instead.
        var bs = movePropsToBackingStore(entity);

        // assign default values to the entity
        var stype = entity.entityType || entity.complexType;
        stype.getProperties().forEach(function(prop) {
            var propName = prop.name;
            var val = entity[propName];
            if (prop.isDataProperty) {
                if (prop.isComplexProperty) {
                    if (prop.isScalar) {
                        val = prop.dataType._createInstanceCore(entity, prop);
                    } else {
                        val = breeze.makeComplexArray([], entity, prop);
                    }
                } else if (!prop.isScalar) {
                    val = breeze.makePrimitiveArray([], entity, prop);
                } else if (val === undefined) {
                    val = prop.defaultValue;
                }

            } else if (prop.isNavigationProperty) {
                if (val !== undefined) {
                    throw new Error("Cannot assign a navigation property in an entity ctor.: " + prop.name);
                }
                if (prop.isScalar) {
                    // TODO: change this to nullstub later.
                    val = null;
                } else {
                    val = breeze.makeRelationArray([], entity, prop);
                }
            } else {
                throw new Error("unknown property: " + propName);
            }
            // can't touch the normal property sets within this method (IE9 Bug) - so we access the backingStore directly instead.
            // otherwise we could just do
            // entity[propName] = val
            // after all of the interception logic had been injected.
            bs[propName] = val;
        });
    }

    // 'movePropsToBackingStore' called when an instance is first created
    // via materialization or createEntity.
    // this method cannot be called while a 'defineProperty' accessor is executing
    // because of IE bug mentioned in 'startTracking'.
    function movePropsToBackingStore(instance) {

        var bs = getBackingStore(instance);
        var proto = Object.getPrototypeOf(instance);
        var stype = proto.entityType || proto.complexType;
        stype.getProperties().forEach(function(prop) {
            var propName = prop.name;
            if (!instance.hasOwnProperty(propName)) return;
            // pulls off the value, removes the instance property and then rewrites it via ES5 accessor
            var value = instance[propName];
            delete instance[propName];
            instance[propName] = value;
        });
        return bs;
    }

    // 'movePropDefsToProto' called during Metadata initialization to properties for interception
    function movePropDefsToProto(proto) {
        var stype = proto.entityType || proto.complexType;
        var ctor = proto.constructor;
        if (!ctor){
            throw new Error("No type constructor for EntityType = "+stype.name);
        }
        addResetFn(ctor);
        stype.getProperties().forEach(function(prop) {
            var propName = prop.name;
            if (propName in proto) {
                wrapPrototypeProperty(proto, prop);
            } else {
                wrapInstanceProperty(proto, prop);
            }
        });
    }

    // Adds '__reset__' class fn which restores ctor to its pre-registration state,
    // removing properties added during registration and
    // restoring intercepted properties to their original condition.
    // Intended for test setup/teardown.
    // May be useful if moving a type ctor from one MetadataStore to another
    // with different property characteristics for this type.
    // Remember: a type ctor can belong to at most one EntityType at a time.
    function addResetFn(ctor){
        if (ctor.__reset__) { return; } // already added

        ctor.__reset__ =  function (){
            var proto = ctor.prototype;
            delete proto._$interceptor;
            delete proto._$typeName;
            delete proto._pendingBackingStores;
            delete proto.getProperty;
            delete proto.setProperty;
            delete proto.entityType;
            delete proto.complexType;
            resetProto(proto);
            delete ctor.__reset__;

            function resetProto(proto){
                if (Object.keys(proto).length !== 0) {
                    var protoResets = proto.__resets__;
                    if (protoResets){
                        for (var key in protoResets ){
                            protoResets[key]();
                        }
                        delete proto.__resets__;
                    }
                    resetProto(Object.getPrototypeOf(proto));
                }
            }
        };
    }

    function wrapInstanceProperty(proto, property) {
        var propName = property.name;

        var protoResets = proto.__resets__;
        if (protoResets){
            if (protoResets[propName]){ return; } // already re-written
        } else {
            protoResets = proto.__resets__ = {};
        }

        if (!proto._pendingBackingStores) {
            proto._pendingBackingStores = [];
        }

        var descr = {
            get: function () {
                var bs = this._backingStore || getBackingStore(this);
                return bs[propName];
            },
            set: function (value) {
                // IE9 cannot create 'instance._backingStore' when 'set' is executing
                // so cache value in a '_pendingBackingStore' until have opportunity
                // to create 'this._backingStore' and move value into it.
                var bs = this._backingStore || getPendingBackingStore(this);
                var accessorFn = getAccessorFn(bs, propName);
                this._$interceptor(property, value, accessorFn);
            },
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(proto, propName, descr);

        // remember how to restore this property to pre-registration state
        protoResets[propName] = function(){ delete proto[propName]; };

        // A caching version of this 'getAccessorFn' was removed
        // as the perf gain is minimal or negative based on simple testing.
        function getAccessorFn(bs, propName) {
            return function () {
                if (arguments.length == 0) {
                    return bs[propName];
                } else {
                    bs[propName] = arguments[0];
                }
            };
        }
    }

    function wrapPrototypeProperty(proto, property) {
        var propName = property.name;
        if (!proto.hasOwnProperty(propName)) {
            var nextProto = Object.getPrototypeOf(proto);
            wrapPrototypeProperty(nextProto, property);
            return;
        }

        var propDescr = Object.getOwnPropertyDescriptor(proto, propName);
        // if not configurable; we can't touch it - so leave.
        if (!propDescr.configurable) return;
        // if a data descriptor - don't wrap it 
        // Treat it is a static ReadOnly property - i.e. defined on every instance of the type with the same value.
        // No safe alternative even if writable as it could be made non-writable at any time.
        if (propDescr.value) return;
        // if a read only property descriptor - no need to change it.
        if (!propDescr.set) return;

        var protoResets = proto.__resets__;
        if (protoResets) {
            if (protoResets[propName]) { return; } // already wrapped
        } else {
            proto.__resets__ = protoResets = {};
        }

        var newDescr = {
            get: function () {
                return propDescr.get.bind(this)();
            },
            set: function (value) {
                this._$interceptor(property, value, getAccessorFn(this));
            },
            enumerable: propDescr.enumerable,
            configurable: true
        };

        Object.defineProperty(proto, propName, newDescr);

        // remember how to restore this property to pre-registration state
        protoResets[propName] = function(){
            Object.defineProperty(proto, propName, propDescr);
        };

        function getAccessorFn(entity) {
            return function() {
                if (arguments.length == 0) {
                    return propDescr.get.bind(entity)();
                } else {
                    propDescr.set.bind(entity)(arguments[0]);
                }
            }
        }
    }

    function getBackingStore(instance) {
        var proto = Object.getPrototypeOf(instance);
        processPendingStores(proto);
        var bs = instance._backingStore;
        if (!bs) {
            bs = {};
            instance._backingStore = bs;
        }
        return bs;
    }

    // workaround for IE9 bug where instance properties cannot be changed when executing a property 'set' method.
    function getPendingBackingStore(instance) {
        var proto = Object.getPrototypeOf(instance);
        var pendingStores = proto._pendingBackingStores;
        var pending = core.arrayFirst(pendingStores, function (pending) {
            return pending.entity === instance;
        });
        if (pending) return pending.backingStore;
        var bs = {};
        pendingStores.push({ entity: instance, backingStore: bs });
        return bs;
    }

    function processPendingStores(proto) {
        var pendingStores = proto._pendingBackingStores;
        if (pendingStores) {
            pendingStores.forEach(function (pending) {
                pending.entity._backingStore = pending.backingStore;
            });
            pendingStores.length = 0;
        }
    }

    breeze.config.registerAdapter("modelLibrary", ctor);

}));
