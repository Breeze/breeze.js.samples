// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function(testFns) {
  "use strict";

  /*********************************************************
    * Breeze configuration and module setup
    *********************************************************/
  var ajaxAdapter = breeze.config.getAdapterInstance('ajax');
  var ajaxSpy, em;

  // Classes we'll need from the breeze namespaces
  var EntityQuery = breeze.EntityQuery;
  var handleFail = testFns.handleFail;

  // Target the Todos service
  var serviceName = testFns.todosServiceName;
  var newEm = testFns.newEmFactory(serviceName);

  /*=========== SaveQueuing Module ===================*/
  var moduleOptions = {
    setup: function() {
      testFns.populateMetadataStore(newEm);
      em = newEm();
      em.enableSaveQueuing(true); // <--
      ajaxSpy = sinon.spy(ajaxAdapter, 'ajax');
    },
    teardown: function() {
      // reset Todos db and adapter after each test because
      // we're messing them up
      ajaxSpy.restore();
      testFns.teardown_todosReset();
    }
  };
  module("saveQueuing", moduleOptions);

  /*********************************************************
    * second save of added entity does not duplicate it
    *********************************************************/
  asyncTest("second save of added entity does not duplicate it", function() {
    expect(2);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 30); // max allowed
    em.createEntity('TodoItem', { Description: description });

    var save1 = em.saveChanges();
    var save2 = em.saveChanges();

    Q.all([save1, save2])
      .then(requery)
      .then(success)
      .catch(handleFail)
      .finally(start);

    function requery(results) {
      return EntityQuery.from('Todos')
        .where('Description', 'eq', description)
        .using(em).execute();
    }

    function success(data) {
      equal(data.results.length, 1,
        "Re-queried exactly one TodoItem w/ that description.");
      equal(em.getEntities().length, 1, "Only one entity in cache");
    }
  });

  /*********************************************************
    * second save w/ savequeuing does not resave an added entity
    * unless you modify the added entity between saves
    *********************************************************/
  asyncTest("second save of added entity does not save twice if no change", function() {
    expect(5);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 30); // max allowed
    em.createEntity('TodoItem', { Description: description });

    var save1 = em.saveChanges();
    var save2 = em.saveChanges();

    Q.all([save1, save2])
      .then(requery)
      .then(afterSaves)
      .catch(handleFail)
      .finally(start);

    function requery(results) {
      equal(ajaxSpy.callCount, 1,
        'ajax should have been called only once');

      var urlCalled = ajaxSpy.args[0][0].url;
      ok(/SaveChanges/.test(urlCalled),
        "first call should have been a SaveChanges; was " + urlCalled);

      var stateName = getEntityStateOfSavedEntityInAjaxCall(0);
      equal(stateName, 'Added', 'first save should have been an "Added" entity');

      return EntityQuery.from('Todos')
        .where('Description', 'eq', description)
        .using(em).execute();
    }

    function afterSaves(data) {
      equal(data.results.length, 1,
        "Re-queried exactly one TodoItem w/ that description.");
      equal(em.getEntities().length, 1, "Only one entity in cache");
    }
  });

  /*********************************************************
    * overwrites same value in added entity that is changed while saving
    * when that save completes before the modified entity is saved
    * This is standard behavior, w/ or w/o saveQueuing
    *********************************************************/
  asyncTest("the save response overwrites changes to entity made during save", function() {
    expect(2);

    var todo = em.createEntity('TodoItem', { Description: 'Test' });
    em.saveChanges()
      .then(success).catch(handleFail).finally(start);

    // make change while save is in progress
    todo.setProperty('Description', 'Todomod');

    function success(data) {
      var aspect = todo.entityAspect;
      equal(aspect.entityState.name, 'Unchanged',
        "added Todo was saved and now is Unchanged");
      equal(todo.getProperty('Description'), 'Test',
        "description has the saved (not the modified) value");
    }
  });

  /*********************************************************
    * saves value in added entity that is changed while save in progress
    * then saved again before first save returns.
    * This test would fail in the 2nd assert in saveQueuing v.1; works in v.2
    *********************************************************/
  asyncTest("can save modified value during save of ADDED entity", function() {
    expect(2);

    var todo = em.createEntity('TodoItem', { Description: 'Test' });
    em.saveChanges().catch(handleFail);

    // make change while save is in progress
    todo.setProperty('Description', 'Todo mod');

    // save immediately, before first save response
    return em.saveChanges()
      .then(success).catch(handleFail).finally(start);

    // After second save
    function success(data) {
      var aspect = todo.entityAspect;
      equal(aspect.entityState.name, 'Unchanged',
        "modified Todo was saved and now is Unchanged");
      equal(todo.getProperty('Description'), 'Todo mod',
        "description has the modified value, changed between saves");
    }
  });

  /*********************************************************
    * saves same value in modified entity that is changed while save in progress
    * then saved again before first save returns.
    * This test would fail in the 2nd assert in saveQueuing v.1; works in v.2
    *********************************************************/
  asyncTest("saves SAME modified value of MODIFIED entity when saved before 1st save completes", function() {
    expect(2);

    var todo = em.createEntity('TodoItem', { Description: 'Test' });
    em.saveChanges()
      .then(modAndSave)
      .catch(handleFail).finally(start);

    function modAndSave() {
      // modify the existing Todo
      todo.setProperty('Description', 'Todo mod 1');

      // save the first mod
      em.saveChanges().catch(handleFail);

      // modify it again while the save is in progress
      todo.setProperty('Description', 'Todo mod 2');

      // save immediately, before first save response
      return em.saveChanges()
        .then(success).catch(handleFail);

      // After second save
      function success(data) {
        var aspect = todo.entityAspect;
        equal(aspect.entityState.name, 'Unchanged',
          "double modified Todo was saved and now is Unchanged");
        equal(todo.getProperty('Description'), 'Todo mod 2',
          "description has the value modified during save");
      }
    }
  });

  /*********************************************************
    * saves different value in modified entity that is changed while save in progress
    * then saved again before first save returns.
    * This test would fail in the 2nd assert in saveQueuing v.1; works in v.2
    *********************************************************/
  asyncTest("saves DIFFERENT modified value of MODIFIED entity when saved before 1st save completes", function() {
    expect(4);

    var todo = em.createEntity('TodoItem', {
      Description: 'Test',
      IsDone: false
    });
    em.saveChanges()
      .then(modAndSave)
      .then(requery)
      .then(success)
      .catch(handleFail).finally(start);

    function modAndSave() {
      // modify the existing Todo
      todo.setProperty('Description', 'Todo mod 1');

      // save the first mod
      em.saveChanges().catch(handleFail);

      equal(todo.getProperty('IsDone'), false,
        "isDone is false while 1st save in progress, just before mod");

      // modify different property while the 1st save is in progress
      todo.setProperty('IsDone', true);

      // save now, before the first save response
      return em.saveChanges();
    }

    // 2nd save callback
    function requery(sr) {
      em.clear(); // paranoia.
      return EntityQuery.from('Todos')
        .where('Id', 'eq', todo.getProperty('Id'))
        .using(em).execute();
    }

    function success(data) {
      todo = data.results[0];
      var aspect = todo.entityAspect;
      equal(aspect.entityState.name, 'Unchanged',
        "double modified Todo was saved, requeried, and is Unchanged");
      equal(todo.getProperty('Description'), 'Todo mod 1',
        "description has the modified value, 'Todo mod 1'");
      equal(todo.getProperty('IsDone'), true,
        "isDone has the value modified (true) during 1st save");
    }
  });

  /*********************************************************
    * Two [add+save] events are in separate saves
    *********************************************************/
  asyncTest("Two [add+save] events are in two separate saves", function() {
    expect(7);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 27); // max allowed is 30

    var todo1 = em.createEntity('TodoItem', { Description: description + '-1a' });

    var save1 = em.saveChanges()
      .then(firstSaveSucceeded)
      .catch(handleFail);

    var todo2 = em.createEntity('TodoItem', { Description: description + '-2a' });

    var save2 = em.saveChanges()
      .then(secondSaveSucceeded)
      .catch(handleFail);

    equal(em.getChanges().length, 2, "two pending changes while first save is in flight");

    Q.all([save1, save2])
      .then(requery)
      .then(confirm)
      .catch(handleFail)
      .finally(start);

    function firstSaveSucceeded(saveResult) {
      var saved = saveResult.entities;
      equal(saved.length, 1, "1st save should save a single Todo");
      ok(saved.indexOf(todo1) > -1, 'it should be todo1');

      return saveResult;
    }

    function secondSaveSucceeded(saveResult) {
      var saved = saveResult.entities;
      equal(saved.length, 1, "2nd save should save a single Todo");
      ok(saved.indexOf(todo2) > -1, 'it should be todo2');

      ok(!em.hasChanges(), "should have no more pending changes");

      return saveResult;
    }

    function requery(results) {
      return EntityQuery.from('Todos')
        .where('Description', 'startsWith', description)
        .using(em).execute();
    }

    function confirm(data) {
      var results = data.results;
      equal(results.length, 2, 'should have requeried 2 Todos');
    }
  });

  /*********************************************************
    * [add + save + (mod add, new add) + save] resaves first entity
    * Note that the re-save of the first add is a modify save
    *********************************************************/
  asyncTest("[add + save + (mod add, new add) + save] resaves first entity", function() {
    expect(11);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 27); // max allowed is 30

    var todo1 = em.createEntity('TodoItem', { Description: description + '-1a' });

    var save1 = em.saveChanges()
      .then(firstSaveSucceeded)
      .catch(handleFail);

    var todo2 = em.createEntity('TodoItem', { Description: description + '-2a' });

    // make change to todo1 while it is being saved
    todo1.setProperty('Description', description + '-1m');

    var save2 = em.saveChanges()
      .then(secondSaveSucceeded)
      .catch(handleFail);

    equal(em.getChanges().length, 2, "two pending changes while first save is in flight");

    Q.all([save1, save2])
      .then(requery)
      .then(confirm)
      .catch(handleFail)
      .finally(start);

    function firstSaveSucceeded(saveResult) {
      var saved = saveResult.entities;
      equal(saved.length, 1, "1st save should save a single Todo");
      ok(saved.indexOf(todo1) > -1, 'it should be todo1');

      return saveResult;
    }

    function secondSaveSucceeded(saveResult) {
      var ix, stateName;
      var saved = saveResult.entities;
      equal(saved.length, 2, "2nd save should save two Todos");

      ix = saved.indexOf(todo1);
      ok(ix > -1, 'one of them is todo1');
      stateName = getEntityStateOfSavedEntityInAjaxCall(1, ix);
      equal(stateName, 'Modified', 'todo1 should have been a "Modified" save');

      ix = saved.indexOf(todo2);
      ok(ix > -1, 'one of them is todo2');
      stateName = getEntityStateOfSavedEntityInAjaxCall(1, ix);
      equal(stateName, 'Added', 'todo2 should have been an "Added" save');

      ok(!em.hasChanges(), "should have no more pending changes");

      return saveResult;
    }

    function requery(results) {
      return EntityQuery.from('Todos')
        .where('Description', 'startsWith', description)
        .using(em).execute();
    }

    function confirm(data) {
      var results = data.results;
      equal(results.length, 2, 'should have requeried 2 Todos');

      var desc = todo1.getProperty('Description');
      ok(desc.indexOf('-1m') > -1,
        'todo1 should have the modified description; is ' + desc);
    }

  });

  /*********************************************************
    * Queued saves will be combined but will not double-save
    * Here the 2nd and 3rd are combined while #1 is in-flight
    * Both 2 and 3 are modified after they have been queued for save
    * Their post-save values will reflect the modifications
    *********************************************************/
  asyncTest("Queued saves will be combined", function() {
    expect(9);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 27); // max allowed is 30

    em.createEntity('TodoItem', { Description: description + '-1a' });
    var save1 = em.saveChanges();

    var todo2 = em.createEntity('TodoItem', { Description: description + '-2a' });
    var save2 = em.saveChanges();

    var todo3 = em.createEntity('TodoItem', { Description: description + '-3a' });
    var save3 = em.saveChanges();

    // modify the second and third todos while queued for save
    todo2.setProperty('Description', description + '-2m');
    todo3.setProperty('Description', description + '-3m');

    equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

    Q.all([save1, save2, save3])
      .then(requery)
      .then(confirm)
      .catch(handleFail)
      .finally(start);

    function requery(results) {
      var entities = em.getEntities();
      equal(entities.length, 3, 'should have exactly 3 in cache');
      equal(em.getChanges().length, 0, "should have no more pending changes");

      equal(ajaxSpy.callCount, 2,
        'ajax should have been called twice');

      var urlCalled = ajaxSpy.args[0][0].url;
      ok(/SaveChanges/.test(urlCalled),
        "1st time should have been SaveChanges; was " + urlCalled);

      urlCalled = ajaxSpy.args[1][0].url;
      ok(/SaveChanges/.test(urlCalled),
        "2nd time should have been SaveChanges; was " + urlCalled);

      return EntityQuery.from('Todos')
        .where('Description', 'startsWith', description)
        .using(em).execute();
    }

    function confirm(data) {
      var results = data.results;
      equal(results.length, 3, 'should have requeried 3 entities');

      var desc = todo2.getProperty('Description');
      ok(desc.indexOf('-2m') > -1,
        'Todo2 should have the modified description; is ' + desc);

      desc = todo3.getProperty('Description');
      ok(desc.indexOf('-3m') > -1,
        'Todo3 should have the modified description; is ' + desc);
    }
  });

  /*********************************************************
    * A change that wasn't saved will not be saved by a queued save
    * Should only save entities with pending changes at the time
    * that saveChanges is called. Subsequent changes should
    * remain pending and not be saved by a queued save.
    *********************************************************/
  asyncTest("A change that wasn't saved will not be saved by a queued save", function() {
    expect(5);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 27); // max allowed is 30

    em.createEntity('TodoItem', { Description: description + '-1a' });
    var save1 = em.saveChanges();

    em.createEntity('TodoItem', { Description: description + '-2a' });
    var save2 = em.saveChanges();

    var todo3 = em.createEntity('TodoItem', { Description: description + '-3a' });

    // NOT calling save on todo3; therefore it should NOT be saved

    equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

    Q.all([save1, save2])
      .then(requery)
      .then(confirm)
      .catch(handleFail)
      .finally(start);

    function requery(results) {
      var entities = em.getEntities();
      equal(entities.length, 3, 'should have exactly 3 in cache');
      equal(em.getChanges().length, 1, "should have one more pending changes");

      var stateName = todo3.entityAspect.entityState.name;
      equal(stateName, 'Added', 'todo3 remains in the "Added" state');

      return EntityQuery.from('Todos')
        .where('Description', 'startsWith', description)
        .using(em).execute();
    }

    function confirm(data) {
      var results = data.results;
      equal(results.length, 2, 'should have requeried 2 entities');
    }
  });

  /*********************************************************
    * a queued save of nothing returns the saved nothing resolved promise
    *********************************************************/
  asyncTest("a queued save of nothing returns the 'saved nothing' resolved promise", function() {
    expect(4);

    var todo1 = em.createEntity('TodoItem', { Description: 'Todo 1' });

    var save1 = em.saveChanges();
    var save2 = em.saveChanges([]);

    Q.all([save1, save2])
      .then(afterSaves)
      .catch(handleFail)
      .finally(start);

    function afterSaves(results) {
      equal(ajaxSpy.callCount, 1,
        'ajax should have been called only once (not for the empty save)');

      equal(results[0].entities.indexOf(todo1), 0,
        'first save should have returned the saved todo1');

      equal(results[1].entities.length, 0,
        '"empty save" should have returned the "saved nothing" result');

      var stateName = todo1.entityAspect.entityState.name;
      equal(stateName, 'Unchanged', 'saved todo 1 should be "Unchanged"');
    }
  });

  /*********************************************************
    * Can save selected entities (pass entities to SaveChanges)
    *********************************************************/
  asyncTest("Can save selected entities (pass entities to SaveChanges)", function() {
    expect(8);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 27); // max allowed is 30

    var todo1 = em.createEntity('TodoItem', { Description: description + '-1a' });
    var todo2 = em.createEntity('TodoItem', { Description: description + '-2a' });

    // should only save todo1
    var save1 = em.saveChanges([todo1]).then(firstSaveSucceeded);
    ok(!todo2.entityAspect.isBeingSaved, 'todo2 should not be saving during save1');

    // save of todo2 will be queued, unlike native saveChanges which could save it immediately
    var save2 = em.saveChanges().then(secondSaveSucceeded);

    var todo3 = em.createEntity('TodoItem', { Description: description + '-3a' });

    // NOT calling save on todo3; therefore it should NOT be saved

    equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

    Q.all([save1, save2])
      .then(requery)
      .then(confirm)
      .catch(handleFail)
      .finally(start);

    function requery(results) {
      var entities = em.getEntities();
      equal(entities.length, 3, 'should have exactly 3 in cache');
      equal(em.getChanges().length, 1, "should have one more pending changes");

      var stateName = todo3.entityAspect.entityState.name;
      equal(stateName, 'Added', 'todo3 remains in the "Added" state');

      return EntityQuery.from('Todos')
        .where('Description', 'startsWith', description)
        .using(em).execute();
    }

    function confirm(data) {
      var results = data.results;
      equal(results.length, 2, 'should have requeried 2 entities');
    }

    function firstSaveSucceeded(saveResult) {
      ok(saveResult.entities.length === 1 &&
        saveResult.entities[0] === todo1, '1st save should have only saved todo1');
      return saveResult;
    }

    function secondSaveSucceeded(saveResult) {
      ok(saveResult.entities.length === 1 &&
        saveResult.entities[0] === todo2, '2nd save should have only saved todo2');
      return saveResult;
    }
  });

  /*********************************************************
    * After save, the added entities have empty originalValues
    *********************************************************/
  asyncTest("the added entities have empty originalValues after save", function() {
    expect(2);

    var description = 'Test' + testFns.newGuid().toString();
    description = description.substr(0, 27); // max allowed is 30

    em.createEntity('TodoItem', { Description: description + '-1a' });
    var save1 = em.saveChanges();

    em.createEntity('TodoItem', { Description: description + '-2a' });
    var save2 = em.saveChanges();

    em.createEntity('TodoItem', { Description: description + '-3a' });
    var save3 = em.saveChanges();

    Q.all([save1, save2, save3])
      .then(confirm)
      .catch(handleFail).finally(start);

    function confirm() {
      var todos = em.getEntities();
      equal(todos.length, 3, 'should have only the 3 added todos in cache');

      var noneHaveOriginalValues = todos.every(function(e) {
        return Object.keys(e.entityAspect.originalValues).length === 0;
      });

      ok(noneHaveOriginalValues,
        'none of the saved entities have originalValues after save.');
    }

  });

  /*********************************************************
    * Cannot delete an ADDED or MODIFIED entity while it's being saved
    * This is standard behavior, w/ or w/o saveQueuing,
    * The exception is thrown when setDeleted() called
    * as of Breeze v.1.5.2
    *********************************************************/
  asyncTest("cannot delete an added entity while it's being saved", function() {
    expect(1);

    var todo = em.createEntity('TodoItem', { Description: 'Test' });
    em.saveChanges()
      .catch(handleFail).finally(start);

    var msgSuffix = ' to delete an added entity that is being saved';

    // try to delete the added entity before the save returns
    try {
      todo.entityAspect.setDeleted();
      handleFail('can setDeleted when should not be able' + msgSuffix);
    } catch (err) {
      ok(/cannot.*being saved/i.test(err),
        'should throw when try' + msgSuffix + '\n; threw ' + err);
    }

  });

  asyncTest("cannot delete a modified entity while it's being saved", function() {
    expect(1);

    var todo = em.createEntity('TodoItem', {
      Description: 'Test',
      IsDone: false
    });

    em.saveChanges()
      .then(modifyAndSaveAndDelete)
      .catch(handleFail).finally(start);

    function modifyAndSaveAndDelete() {
      todo.setProperty('Description', 'Todo mod');
      em.saveChanges();

      var msgSuffix = ' to delete a modified entity that is being saved';

      // try to delete the modified entity before the modify save returns
      try {
        todo.entityAspect.setDeleted();
        handleFail('can setDeleted when should not be able' + msgSuffix);
      } catch (err) {
        ok(/cannot.*being saved/i.test(err),
          'should throw when try' + msgSuffix + '\n; threw ' + err);
      }
    }

  });

  /*********************************************************
    * Can delete an ADDED or MODIFIED entity 
    * if it is queued for save but not currently being saved
    * This is standard behavior, w/ or w/o saveQueuing,
    *********************************************************/
  asyncTest("can delete a queued added entity", function() {
    expect(4);

    em.createEntity('TodoItem', { Description: 'Todo 1' });
    var save1 = em.saveChanges()
      .then(firstSaveSucceeded, firstSaveFailed);

    // created while save is in progress
    var todo2 = em.createEntity('TodoItem', { Description: 'Todo 2' });

    // save-in-progress; todo2 will be queued for next actual save
    var save2 = em.saveChanges();

    // delete the queued new todo2 before the save returns
    todo2.entityAspect.setDeleted();

    Q.all([save1, save2])
      .then(afterSaves)
      .catch(handleFail).finally(start);

    function afterSaves(results) {
      var saved = results[0].entities;
      equal(saved.length, 1, 'first save succeeded in saving 1st todo');

      saved = results[1].entities;
      equal(saved.length, 0, 'second save succeeded but saved nothing');

      var stateName = todo2.entityAspect.entityState.name;
      equal(stateName, 'Detached', 'todo2 should be "Detached"; is ' + stateName);
    }

    function firstSaveSucceeded(saveResult) {
      ok(true, "the 1st save should have succeeded");
      return saveResult;
    }

    function firstSaveFailed(error) {
      ok(false, "the 1st save should have succeeded, error was " + error.message);
      return breeze.Q.reject(error);
    }
  });

  /*********************************************************
    * Failure in a middle save aborts the rest
    *********************************************************/
  asyncTest("Failure in a middle save aborts the rest (and have much err info)", function() {
    expect(13);
    var error2;

    var todo1 = em.createEntity('TodoItem', { Description: 'Todo 1' });
    var save1 = em.saveChanges()
      .then(firstSaveSucceeded)
      .catch(handleFail);

    // fake a change to non-existent entity
    // save should fail
    var todo2 = em.createEntity('TodoItem', {
      Id: 100000, // not a real id
      Description: 'Todo 2'
    }, breeze.EntityState.Modified);

    var save2 = em.saveChanges()
      .then(secondSaveSucceeded)
      .catch(secondSaveFailed);

    var todo3 = em.createEntity('TodoItem', { Description: 'Todo 3' });
    var save3 = em.saveChanges()
      .then(thirdSaveSucceeded)
      .catch(thirdSaveFailed);

    equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

    Q.all([save1, save2, save3])
      .then(afterSaves)
      .then(handleFail).finally(start);

    function firstSaveSucceeded(saveResult) {
      var savedCount = saveResult.entities.length;
      equal(savedCount, 1,
        "1st save should save a single Todo");
      equal(saveResult.entities[0].getProperty('Description'),
        todo1.getProperty('Description'),
        "1st save should be 'todo1'");
      return saveResult;
    }

    function secondSaveSucceeded(saveResult) {
      var err = "the 2nd save should have failed";
      ok(false, "the 2nd save should have failed");
      return Q.reject(err);
    }

    function secondSaveFailed(error) {
      error2 = error; // we'll see this again in thirdSaveFailed
      ok(true,
        'the 2nd save should have failed, the error was "{0}"'
        .format(error.message));

      // `error.failedSaveMemo` is the saveMemo that prompted this save
      // `error.pendingSaveMemo` holds unsaved changes accumulated since that save.
      // You may try to recover using this info. Good luck with that.
      // It is gone forever after this moment.
      var failedSaveMemo = error.failedSaveMemo;
      ok(failedSaveMemo != null,
        'can access the `failedSaveMemo` on the 2nd save `error`');
      if (failedSaveMemo) {
        equal(Object.keys(failedSaveMemo.entityMemos).length, 1,
          '`saveMemo.entityMemos` has the pending changes to Todo1');
        var queuedChanges = failedSaveMemo.queuedChanges;
        ok(queuedChanges.indexOf(todo2) !== -1,
          '`saveMemo.queuedChanges` holds todo2');
        ok(queuedChanges.indexOf(todo3) !== -1,
          '`saveMemo.queuedChanges` holds todo3');
      }
      // DO NOT re-reject as we have "handled" it.
    }

    function thirdSaveSucceeded(saveResult) {
      ok(false, "the 3rd save should have been aborted");
    }

    function thirdSaveFailed(error) {
      ok(error === error2,
        'the 3rd save should have failed with the save error as save #2');
      // DO NOT re-reject as we have "handled" it.
    }

    function afterSaves(results) {
      ok(typeof results[1] === 'undefined' &&
        typeof results[2] === 'undefined',
        "the 2nd and 3rd save promise results should be undefined " +
        "because failed saves were caught and errors not re-thrown");

      equal(todo1.entityAspect.entityState.name, "Unchanged",
        "'todo1' was saved and is in the 'Unchanged' state.");

      var changes = em.getChanges();
      ok(changes.indexOf(todo2) > -1,
        "todo2 is among the pending changes");
      ok(changes.indexOf(todo3) > -1,
        "todo3 is among the pending changes");
    }
  });

  /*********************************************************
    * Failure in first save aborts the rest
    *********************************************************/
  asyncTest("Failure in first save aborts the rest", function() {
    expect(6);

    em.createEntity('TodoItem', { Description: 'Todo 1' });

    // fake a server failure upon next save
    setOneTimeAjaxFailure();

    var save1 = em.saveChanges()
      .then(firstSaveSucceeded)
      .catch(firstSaveFailed);

    em.createEntity('TodoItem', { Description: 'Todo 2' });
    var save2 = em.saveChanges()
      .then(laterSaveSucceeded)
      .catch(laterSaveFailed);

    em.createEntity('TodoItem', { Description: 'Todo 3' });
    var save3 = em.saveChanges()
      .then(laterSaveSucceeded)
      .catch(laterSaveFailed);

    equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

    Q.all([save1, save2, save3])
      .then(afterSaves)
      .finally(start);

    function firstSaveSucceeded(saveResult) {
      ok(false, "the 1st save should have failed");
    }

    function firstSaveFailed(error) {
      ok(true,
        "the 1st save should have failed, the error was '{0}'"
        .format(error.message));
    }

    function laterSaveSucceeded(saveResult) {
      ok(false, "any save after the 1st should have been aborted");
    }

    function laterSaveFailed(error) {
      var expected = /queued save failed/i;
      ok(expected.test(error.message),
        "any save after the 1st should have aborted with " +
        "queued save termination error: '{0}'"
        .format(error.message));
    }

    function afterSaves(results) {
      ok(results.reduce(
          function(p, c) { return p && typeof c === 'undefined'; },
          true),
        "all save promise results should be undefined because " +
        "failed saves were caught and errors not re-thrown");

      equal(em.getChanges().length, 3,
        "all three entities should still have pending changes");
    }
  });

  /*********************************************************
  * Validation error in later queued save aborts earlier queued saves
  *********************************************************/
  asyncTest("Validation error in later queued save aborts earlier queued saves", function () {
      expect(8);

      var todo1 = em.createEntity('TodoItem', { Description: 'Todo 1' });
      var save1 = em.saveChanges()
          .then(firstSaveSucceeded, firstSaveFailed);

      // queue second save of two valid entities
      todo1.setProperty('Description', 'Todo 1m');
      var todo2 = em.createEntity('TodoItem', { Description: 'Todo 2' });
      var save2 = em.saveChanges()
          .then(secondSaveSucceeded, secondSaveFailed);

      // invalid because todo3 lacks required Description
      var todo3 = em.createEntity('TodoItem');
      todo3.entityAspect.validateEntity();
      var errors = todo3.entityAspect.getValidationErrors();
      equal(errors.length, 1,
          'todo3 should have one validation error: ' + errors[0].errorMessage);

      // try save ... which should fail for todo3
      var save3 = em.saveChanges().catch(thirdSaveFailed);

      Q.all([save1, save2, save3])
          .then(afterSaves)
          .catch(handleFail)
          .finally(start);

      function firstSaveSucceeded(saveResult) {
        ok(saveResult.entities.indexOf(todo1) === 0, "the 1st save should have succeeded");
      }
      function firstSaveFailed(error) {
        ok(false, "the 1st save should have succeeded, error was " + error.message);
        return breeze.Q.reject(error);
      }
      function secondSaveSucceeded(saveResult) {
        ok(saveResult.entities.indexOf(todo2) === 0, "the 2nd save should have succeeded");
      }
      function secondSaveFailed(error) {
        ok(false, "the 2nd save should have succeeded, error was " + error.message);
        return breeze.Q.reject(error);
      }

      function thirdSaveFailed(error) {
        ok(/client.*validation error/i.test(error.message),
            "the 3rd save should have aborted with client validation error: '{0}' "
            .format(error.message));
        // DO NOT re-reject; we have handled the expected error.
        return '3rd save error handled';
      }

      function afterSaves(resolvedValues) {
        ok(!resolvedValues[0] && !resolvedValues[1], 'saves 1 & 2 passed as expected');
        ok(resolvedValues[2] == '3rd save error handled', '3rd save failed but was handled');

        var errs = todo3.entityAspect.getValidationErrors();
        equal(errs.length, 1,
            'todo3 should still have one validation error: ' + errs[0].errorMessage);
        var stateName = todo3.entityAspect.entityState.name;
        equal(stateName, 'Added', 'todo3 remains in the "Added" state');
      }
  });

  //////// helpers ////////////

  function getEntityStateOfSavedEntityInAjaxCall(call, entityIndex) {
    entityIndex = (entityIndex == null) ? 0 : entityIndex;
    return JSON.parse(ajaxSpy.getCall(call).args[0].data).entities[entityIndex].entityAspect.entityState;
  }

  function setOneTimeAjaxFailure(status, data) {
    status = (status == null) ? 500 : 500;
    data = data || {
      "Message": "An error has occurred.",
      "ExceptionMessage": "Simulated test server error.",
      "ExceptionType": "System.Exception",
      "StackTrace": null,
    };
    var headers = function () { return {}; };

    function interceptor(requestInfo) {
      requestInfo.config = null; // don't make real ajax call
      //////// $http ///////
      //requestInfo.error(data, status, headers, null, status + 'BAD NEWS');
      ///////// jQuery.ajax ////////
      var statusText = status + 'BAD NEWS';
      var jqXHR = {
        responseText: data,
        status: status,
        getHeaders: headers,
        statusText: statusText
      };
      requestInfo.error(jqXHR, status, statusText);
    }
    interceptor.oneTime = true;
    ajaxAdapter.requestInterceptor = interceptor;
  }

})(docCode.testFns);