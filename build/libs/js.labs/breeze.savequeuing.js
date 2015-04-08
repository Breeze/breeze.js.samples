//#region Copyright, Version, and Description
/*
 * Copyright 2015 IdeaBlade, Inc.  All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Ward Bell
 * Version: 2.0.4
 * --------------------------------------------------------------------------------
 * Adds "Save Queuing" capability to new EntityManagers
 *
 * Save Queuing automatically queues and defers an EntityManager.saveChanges call
 * when another save is in progress for that manager and the server has not yet responded.
 * This feature is helpful when your app needs to allow rapid, continuous changes
 * to entities that may be in the process of being saved.
 *
 * Without "Save Queuing", an EntityManager will throw an exception
 * when you call saveChanges for an entity which is currently being saved.
 *
 * !!! Use with caution !!!
 * It is usually better to disable user input while a save is in progress.
 * Save Queuing may be appropriate for simple "auto-save" scenarios
 * when the save latency is "short" (under a few seconds).
 *
 * Save Queuing is NOT intended for occassionally disconnected or offline scenarios.
 *
 * Save Queuing is experimental. It will not become a part of BreezeJS core
 * but might become an official Breeze plugin in future
 * although not necessarily in this form or with this API
 *
 * Must call EntityManager.enableSaveQueuing(true) to turn it on;
 * EntityManager.enableSaveQueuing(false) restores the manager's original
 * saveChanges method as it was at the time saveQueuing was first enabled.
 *
 * This module adds "enableSaveQueuing" to the EntityManager prototype.
 * Calling "enableSaveQueuing(true)" adds a new _saveQueuing object
 * to the manager instance.
 *
 * See DocCode:saveQueuingTests.js
 * https://github.com/Breeze/breeze.js.samples/blob/master/net/DocCode/DocCode/tests/saveQueuingTests.js
 *
 * LIMITATIONS
 * - Can't handle changes to the primary key (dangerous in any case)
 * - Assumes promises. Does not support the (deprecated) success and fail callbacks
 * - Does not queue saveOptions. The first one is re-used for all queued saves.
 * - Does not deal with export/import of entities while save is inflight
 * - Does not deal with rejectChanges while save is in flight
 * - Does not support parallel saves even when the change-sets are independent.
 *   The native saveChanges allows such saves.
 *   SaveQueuing does not; too complex and doesn't fit the primary scenario anyway.
 * - The resolved saveResult is the saveResult of the last completed save
 * - A queued save that might have succeeded if saved immediately
 *   may fail because the server no longer accepts it later
 * - Prior to Breeze v.1.5.3, a queued save that might have succeeded
 *   if saved immediately will fail if subsequently attempt to save
 *   an invalid entity. Can detect and circumvent after v.1.5.3.
 *
 * All members of EntityManager._saveQueuing are internal;
 * touch them at your own risk.
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
  var EntityManager = breeze.EntityManager;

  /**
   * Enable (default) or disable "Save Queuing" for this EntityManager
  **/
  EntityManager.prototype.enableSaveQueuing = enableSaveQueuing;

  //TODO: remove after breeze.v.1.5.3 when this method will be defined
  if (!EntityManager.prototype.saveChangesValidateOnClient) {
      EntityManager.prototype.saveChangesValidateOnClient = function() { return null; };
  }

  function enableSaveQueuing(enable) {
    var em = this; // `this` EntityManager
    var saveQueuing = em._saveQueueing ||
        (em._saveQueuing = new SaveQueuing(em));

    enable = (enable === undefined) ? true : enable;
    saveQueuing._isEnabled = enable;
    if (enable) {
      // delegate to save changes queuing
      em.saveChanges = saveChangesWithQueuing;
    } else {
      // revert to the native EntityManager.saveChanges
      em.saveChanges = em._saveQueuing.baseSaveChanges;
    }
  };

  /**
   * Replacement for EntityManager.saveChanges
   * This version queues saveChanges calls while a real save is in progress
   **/
  function saveChangesWithQueuing(entities, saveOptions) {
    try {
      // `this` is an EntityManager
      var saveQueuing = this._saveQueuing;
      if (saveQueuing.isSaving) {
        // save in progress; queue the save for later
        return saveQueuing.queueSaveChanges(entities);
      } else {
        // note that save is in progress; then save
        saveQueuing.isSaving = true;
        saveQueuing.saveOptions = saveOptions;
        return saveQueuing.saveChanges(entities, saveOptions);
      }
    } catch (err) {
      return breeze.Q.reject(err);
    }
  }

  ///////// SaveQueuing /////////
  function SaveQueuing(entityManager) {
    this.entityManager = entityManager;
    this.baseSaveChanges = entityManager.saveChanges;
    this.isSaving = false;
    this.nextSaveDeferred = null;
    this.saveMemo = null;
  };

  SaveQueuing.prototype.isEnabled = function () {
    return this._isEnabled;
  };

  SaveQueuing.prototype.queueSaveChanges = queueSaveChanges;
  SaveQueuing.prototype.saveChanges = saveChanges;
  SaveQueuing.prototype.saveSucceeded = saveSucceeded;
  SaveQueuing.prototype.saveFailed = saveFailed;

  function getSavedNothingResult() {
    return { entities: [], keyMappings: [] };
  }

  function queueSaveChanges(entities) {
    var self = this; // `this` is a SaveQueuing
    var em = self.entityManager;

    var changes = entities || em.getChanges();
    if (changes.length === 0) {
      return breeze.Q.resolve(getSavedNothingResult());
    }

    var valError = em.saveChangesValidateOnClient(changes);
    if (valError){
      return breeze.Q.reject(valError);
    }

    var saveMemo = self.nextSaveMemo || (self.nextSaveMemo = new SaveMemo());
    memoizeChanges();
    var deferred = self.nextSaveDeferred || (self.nextSaveDeferred = breeze.Q.defer());
    return deferred.promise;

    function memoizeChanges() {
      if (changes.length === 0) { return; }
      var queuedChanges = saveMemo.queuedChanges;
      changes.forEach(function (e) {
        if (!e.entityAspect.isBeingSaved && queuedChanges.indexOf(e) === -1) {
          queuedChanges.push(e);
        }
      });

      saveMemo.updateEntityMemos(changes);
    }
  };

  function saveChanges(entities, saveOptions) {
    var self = this; // `this` is a SaveQueuing
    var promise = self.baseSaveChanges.call(self.entityManager, entities, saveOptions || self.saveOptions)
        .then(function (saveResult) { return self.saveSucceeded(saveResult); })
        .then(null, function (error) { return self.saveFailed(error); });
    rememberAddedOriginalValues(entities); // do it after ... so don't send OrigValues to the server
    return promise;

    function rememberAddedOriginalValues() {
      // added entities normally don't have original values but these will now
      var added = entities ?
        entities.filter(function (e) { return e.entityAspect.entityState.isAdded(); }) :
        self.entityManager.getChanges(null, breeze.EntityState.Added);
      added.forEach(function (entity) {
        var props = entity.entityType.dataProperties;
        var originalValues = entity.entityAspect.originalValues;
        props.forEach(function (dp) {
          if (dp.isPartOfKey) { return; }
          originalValues[dp.name] = entity.getProperty(dp.name);
        });
      });
    }
  };

  function saveSucceeded(saveResult) {
    var self = this; // `this` is a SaveQueueing
    var activeSaveDeferred = self.activeSaveDeferred;
    var nextSaveDeferred = self.nextSaveDeferred;
    var nextSaveMemo = self.nextSaveMemo;


    // prepare as if nothing queued or left to save
    self.isSaving = false;
    self.activeSaveDeferred = null;
    self.activeSaveMemo = null;
    self.nextSaveDeferred = null;
    self.nextSaveMemo = null;

    if (nextSaveMemo) {
      // a save was queued since last save returned
      nextSaveMemo.pkFixup(saveResult.keyMappings);
      nextSaveMemo.applyToSavedEntities(self.entityManager, saveResult.entities);
      // remove detached entities from queuedChanges
      var queuedChanges = nextSaveMemo.queuedChanges.filter(function (e) {
        return !e.entityAspect.entityState.isDetached();
      });

      if (queuedChanges.length > 0) {
        // save again
        self.isSaving = true;
        // remember the queued changes that triggered this save
        self.activeSaveDeferred = nextSaveDeferred;
        self.activeSaveMemo = nextSaveMemo;
        self.saveChanges(queuedChanges);
      } else if (nextSaveDeferred) {
          nextSaveDeferred.resolve(getSavedNothingResult());
      }
    }

    if (activeSaveDeferred) { activeSaveDeferred.resolve(saveResult); }
    return saveResult;  // for the current promise chain
  };

  function saveFailed(error) {
    var self = this; // `this` is a SaveQueueing
    error = new QueuedSaveFailedError(error, self);

    var activeSaveDeferred = self.activeSaveDeferred;
    var nextSaveDeferred = self.nextSaveDeferred;

    self.isSaving = false;
    self.activeSaveDeferred = null;
    self.activeSaveMemo = null;
    self.nextSaveDeferred = null;
    self.nextSaveMemo = null;

    if (activeSaveDeferred) { activeSaveDeferred.reject(error); }
    if (nextSaveDeferred) { nextSaveDeferred.reject(error); }

    return breeze.Q.reject(error); // let promise chain hear error
  }

  ////////// QueuedSaveFailedError /////////
  // Error sub-class thrown when rejecting queued saves.
  breeze.QueuedSaveFailedError = QueuedSaveFailedError;

  // Error sub-class thrown when rejecting queued saves.
  // `innerError` is the actual save error
  // `failedSaveMemo` is the saveMemo that prompted this save
  // `nextSaveMemo` holds queued changes accumulated since that save.
  // You may try to recover using this info. Good luck with that.
  function QueuedSaveFailedError(errObject, saveQueuing) {
    this.innerError = errObject;
    this.message = "Queued save failed: " + errObject.message;
    this.failedSaveMemo = saveQueuing.activeSaveMemo;
    this.nextSaveMemo = saveQueuing.nextSaveMemo;
  }

  QueuedSaveFailedError.prototype = new Error();
  QueuedSaveFailedError.prototype.name = "QueuedSaveFailedError";
  QueuedSaveFailedError.prototype.constructor = QueuedSaveFailedError;

  ////////// SaveMemo ////////////////
  // SaveMemo is a record of changes for a queued save, consisting of:
  //   entityMemos:   info about entities that are being saved and
  //                  have been changed since the save started
  //   queuedChanges: entities that are queued for save but
  //                  are not currently being saved
  function SaveMemo() {
    this.entityMemos = {};
    this.queuedChanges = [];
  }

  SaveMemo.prototype.applyToSavedEntities = applyToSavedEntities;
  SaveMemo.prototype.pkFixup = pkFixup;
  SaveMemo.prototype.updateEntityMemos = updateEntityMemos;

  function applyToSavedEntities(entityManager, savedEntities) {
    var entityMemos = this.entityMemos; // `this` is a SaveMemo
    var queuedChanges = this.queuedChanges;
    var restorePublishing = disableManagerPublishing(entityManager);
    try {
      savedEntities.forEach(function (saved) {
        var key = makeEntityMemoKey(saved);
        var entityMemo = entityMemos[key];
        var resave = entityMemo && entityMemo.applyToSavedEntity(saved);
        if (resave) {
          queuedChanges.push(saved);
        }
      });
    } finally {
      restorePublishing();
      // D#2651 hasChanges will be wrong if changes made while save in progress
      var hasChanges = queuedChanges.length > 0;
      // Must use breeze internal method to properly set this flag true
      if (hasChanges) { entityManager._setHasChanges(true); }
    }
  }

  function disableManagerPublishing(manager) {
    var Event = breeze.core.Event;
    Event.enable('entityChanged', manager, false);
    Event.enable('hasChangesChanged', manager, false);

    return function restorePublishing() {
      Event.enable('entityChanged', manager, true);
      Event.enable('hasChangesChanged', manager, true);
    }
  }

  function pkFixup(keyMappings) {
    var entityMemos = this.entityMemos;  // `this` is a SaveMemo
    keyMappings.forEach(function (km) {
      var type = km.entityTypeName;
      var tempKey = type + '|' + km.tempValue;
      if (entityMemos[tempKey]) {
        entityMemos[type + '|' + km.realValue] = entityMemos[tempKey];
        delete entityMemos[tempKey];
      }
      for (var memoKey in entityMemos) {
        entityMemos[memoKey].fkFixup(km);
      }
    });
  }

  function makeEntityMemoKey(entity) {
    var entityKey = entity.entityAspect.getKey();
    return entityKey.entityType.name + '|' + entityKey.values;
  }

  function updateEntityMemos(changes) {
    var entityMemos = this.entityMemos;  // `this` is a SaveMemo
    changes.forEach(function (change) {
      // only update entityMemo for entity being save
      if (!change.entityAspect.isBeingSaved) { return; }

      var key = makeEntityMemoKey(change);
      var entityMemo = entityMemos[key] || (entityMemos[key] = new EntityMemo(change));
      entityMemo.update(change);
    });
  }

  ///////// EntityMemo Type ///////////////
  // Information about an entity that is being saved
  // and which has been changed since that save started
  function EntityMemo(entity) {
    this.entity = entity;
    this.pendingChanges = {};
  }

  EntityMemo.prototype.applyToSavedEntity = applyToSavedEntity;
  EntityMemo.prototype.fkFixup = fkFixup;
  EntityMemo.prototype.update = update;

  function applyToSavedEntity(saved) {
    var entityMemo = this;
    var aspect = saved.entityAspect;
    if (aspect.entityState.isDetached()) {
      return false;
    } else if (entityMemo.isDeleted) {
      aspect.setDeleted();
      return true;
    }
    // treat entity with pending changes as modified
    var props = Object.keys(entityMemo.pendingChanges);
    if (props.length === 0) {
      return false;
    }
    var originalValues = aspect.originalValues;
    props.forEach(function (name) {
      originalValues[name] = saved.getProperty(name);
      saved.setProperty(name, entityMemo.pendingChanges[name]);
    });
    aspect.setModified();
    return true;
  }

  function fkFixup(keyMapping) {
    var entityMemo = this;
    var type = entityMemo.entity.entityType;
    var fkProps = type.foreignKeyProperties;
    fkProps.forEach(function (fkProp) {
      if (fkProp.parentType.name === keyMapping.entityTypeName &&
          entityMemo.pendingChanges[fkProp.name] === keyMapping.tempValue) {
        entityMemo.pendingChanges[fkProp.name] = keyMapping.realValue;
      }
    });
  }

  // update the entityMemo of changes to an entity being saved
  // so that we know how to save it again later
  function update() {
    var entityMemo = this;
    var props;
    var entity = entityMemo.entity;
    var aspect = entity.entityAspect;
    var stateName = aspect.entityState.name;
    switch (stateName) {
      case 'Added':
        var originalValues = aspect.originalValues;
        props = entity.entityType.dataProperties;
        props.forEach(function (dp) {
          if (dp.isPartOfKey) { return; }
          var name = dp.name;
          var value = entity.getProperty(name);
          if (originalValues[name] !== value) {
            entityMemo.pendingChanges[name] = value;
          }
        });
        break;

      case 'Deleted':
        entityMemo.isDeleted = true;
        entityMemo.pendingChanges = {};
        break;

      case 'Modified':
        props = Object.keys(aspect.originalValues);
        props.forEach(function (name) {
          entityMemo.pendingChanges[name] = entity.getProperty(name);
        });
        break;
    }
  }

}));