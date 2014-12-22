//#region Copyright, Version, and Description
/*
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Ward Bell
 * Version: 2.0.2
 * --------------------------------------------------------------------------------
 * Adds "Save Queuing" capability to new EntityManagers
 * "Save Queuing" automatically queues and defers an EntityManager.saveChanges call
 * when another save is in progress for that manager.
 *
 * Without "Save Queuing", an EntityManager will throw an exception when
 * saveChanges is called while another save is in progress.
 *
 * "Save Queuing" is experimental. It may become part of BreezeJS in future
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
 * !!! Use with caution !!!
 * "Save Queuing" is recommended only in simple "auto-save" scenarios wherein
 * users make rapid changes and the UI saves immediately as they do so.
 * It is usually better (and safer) to disable save in the UI
 * while waiting for a prior save to complete
 *
 * LIMITATIONS
 * - Can't queue save options
 * - Can't handle changes to the primary key (dangerous in any case)
 * - Assumes promises. Does not support the (deprecated) success and fail callbacks
 * - Does not queue saveOptions. The first one is re-used for all queued saves.
 * - The saveResult is the saveResult of the LAST completed save
 * - Does not deal with export/import of entities while save is inflight
 * - Does not deal with rejectChanges while save is in flight
 * - A queued save that would have succeeded if saved immediately
 *   will fail if subsequent change makes it invalid before
 *   before it can actually be saved
 * - A queued save that might have succeeded if saved immediately
 *   may fail because the server no longer accepts it later
 *
 * All members of EntityManager._saveQueuing are internal;
 * touch them at your own risk.
 */
//#endregion
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
  'use strict';
  var EntityManager = breeze.EntityManager;

  /**
   * Enable (default) or disable "Save Queuing" for this EntityManager
  **/
  EntityManager.prototype.enableSaveQueuing = enableSaveQueuing;

  function enableSaveQueuing(enable) {

    // Ensure `this` EntityManager has a _saveQueuing object
    if (!this._saveQueuing) {
      this._saveQueuing = new SaveQueuing(this);
    }

    enable = enable === undefined ? true : enable;
    if (enable) {
      // delegate to save changes queuing
      this.saveChanges = saveChangesWithQueuing;
    } else {
      // revert to the native EntityManager.saveChanges
      this.saveChanges = this._saveQueuing.baseSaveChanges;
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
        return saveQueuing.innerSaveChanges(entities, saveOptions);
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
    this.queuedDeferred = null;
    this.saveMemo = null;
  };

  SaveQueuing.prototype.isEnabled = function () {
    return this.entityManager.saveChanges === saveChangesWithQueuing;
  };

  SaveQueuing.prototype.innerSaveChanges = innerSaveChanges;
  SaveQueuing.prototype.queueSaveChanges = queueSaveChanges;
  SaveQueuing.prototype.saveSucceeded = saveSucceeded;
  SaveQueuing.prototype.saveFailed = saveFailed;

  function innerSaveChanges(entities, saveOptions) {
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

  function queueSaveChanges(entities) {
    var self = this; // `this` is a SaveQueuing
    var memo = self.saveMemo || (self.saveMemo = new SaveMemo());
    memoizeChanges(entities);
    var deferred = self.queuedDeferred || (self.queuedDeferred = breeze.Q.defer());
    return deferred.promise;

    function memoizeChanges() {
      var changes = entities || self.entityManager.getChanges();
      if (changes.length === 0) { return; }
      var queuedChanges = memo.queuedChanges;
      changes.forEach(function (e) {
        if (!e.entityAspect.isBeingSaved && queuedChanges.indexOf(e) === -1) {
          queuedChanges.push(e);
        }
      });

      memo.rememberChanges(changes);
    }
  };

  function saveSucceeded(saveResult) {
    var self = this; // `this` is a SaveQueueing
    var saveMemo = self.saveMemo;
    if (saveMemo) {
      // a save was queued since last save returned
      saveMemo.pkFixup(saveResult.keyMappings);
      saveMemo.applyToSavedEntities(self.entityManager, saveResult.entities);
      if (saveMemo.queuedChanges.length > 0) {
        // remember the queued changes that triggered this save
        self.activeSaveMemo = saveMemo;
        // clear the saveMemo for future queued save changes
        self.saveMemo = null;
        // save again
        self.innerSaveChanges(saveMemo.queuedChanges);
        return saveResult;
      }
    }
    // nothing queued or left to save
    self.isSaving = false;
    self.saveMemo = null;
    self.activeSaveMemo = null;
    var deferred = self.queuedDeferred;
    if (deferred) {
      self.queuedDeferred = null;
      deferred.resolve(saveResult);
    }
    return saveResult;
  };

  function saveFailed(error) {
    var self = this; // `this` is a SaveQueueing
    error = new QueuedSaveFailedError(error, self);
    self.isSaving = false;
    self.saveMemo = null;
    self.activeSaveMemo = null;
    var deferred = self.queuedDeferred;
    if (deferred) {
      self.queuedDeferred = null;
      deferred.reject(error);
    }
    // so rest of current promise chain can hear error
    return breeze.Q.reject(error);
  }

  ////////// QueuedSaveFailedError /////////
  // Error sub-class thrown when rejecting queued saves.
  // `innerError` is the actual save error
  // `failedSaveMemo` is the saveMemo that prompted this save
  // `pendingSaveMemo` holds queued changes accumulated since that save.
  // You may try to recover using this info. Good luck with that.
  function QueuedSaveFailedError(errObject, saveQueuing) {
    this.innerError = errObject;
    this.failedSaveMemo = saveQueuing.activeSaveMemo;
    this.pendingSaveMemo = saveQueuing.saveMemo;
  }

  QueuedSaveFailedError.prototype = new Error();
  QueuedSaveFailedError.prototype.name = "QueuedSaveFailedError";
  QueuedSaveFailedError.prototype.message = "Queued save failed";
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
  SaveMemo.prototype.rememberChanges = rememberChanges;

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
      Event.enable('entityChanged', manager, false);
      Event.enable('hasChangesChanged', manager, false);
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

  function rememberChanges(changes) {
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

}, this));