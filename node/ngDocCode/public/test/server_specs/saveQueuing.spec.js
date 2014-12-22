/* jshint -W117, -W030, -W109 */
describe('saveQueuing:', function() {
    "use strict";

    var ajaxAdapter = breeze.config.getAdapterInstance('ajax');
    var ajaxSpy, em;

    var EntityQuery = breeze.EntityQuery;
    var handleFail = ash.handleFail;
    var newEm = ash.newEmFactory(ash.todosServiceName);
    var Q = breeze.Q;

    ash.serverIsRunningPrecondition();

    beforeEach(function(){
        ajaxSpy = sinon.spy(ajaxAdapter, 'ajax');
        em = newEm();
        em.enableSaveQueuing(true); // <--
    });

    afterEach(function(done){
        // reset Todos db and adapter after each test because
        // we're messing them up
        ajaxSpy.restore();
        ash.todosReset().then(done, done);
    });

    /*********************************************************
    * second save of added entity does not duplicate it
    *********************************************************/
    it("second save of added entity does not duplicate it", function (done) {

        var description = 'Test' + ash.newGuid().toString();
        description=description.substr(0,30); // max allowed
        em.createEntity('TodoItem', { Description: description });

        var save1 = em.saveChanges();
        var save2 = em.saveChanges();

        Q.all([save1, save2])
         .then(requery)
         .then(success)
         .then(done, done);

        function requery(results){
            return EntityQuery.from('Todos')
                .where('Description', 'eq', description)
                .using(em).execute();
        }

        function success(data) {
            expect(data.results.length).to.equal(1,
                "Re-queried exactly one TodoItem w/ that description.");
            expect(em.getEntities().length).to.equal(1, "Only one entity in cache");
        }
    });

    /*********************************************************
    * second save w/ savequeuing does not resave an added entity
    * unless you modify the added entity between saves
    *********************************************************/
    it("second save of added entity does not save twice if no change", function (done) {

        var description = 'Test' + ash.newGuid().toString();
        description=description.substr(0,30); // max allowed
        em.createEntity('TodoItem', { Description: description });

        var save1 = em.saveChanges();
        var save2 = em.saveChanges();

        Q.all([save1, save2])
         .then(requery)
         .then(success)
         .then(done, done);

        function requery(results){
            expect(ajaxSpy.callCount).to.equal(1,
                'ajax should only have been called once');

            var urlCalled = ajaxSpy.args[0][0].url;
            expect(urlCalled).to.match(/SaveChanges/, "should have called SaveChanges");

            return EntityQuery.from('Todos')
                .where('Description', 'eq', description)
                .using(em).execute();
        }

        function success(data) {
            expect(data.results).to.have.length(1,
                "Re-queried exactly one TodoItem w/ that description.");
            expect(em.getEntities()).to.have.length(1,
                "Only one entity in cache");
        }
    });

    /*********************************************************
    * overwrites same value in added entity that is changed while saving
    * when that save completes before the modified entity is saved
    * This is standard behavior, w/ or w/o saveQueuing
    *********************************************************/
    it("the save response overwrites changes to entity made during save", function (done) {

        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges()
          .then(success).then(done, done);

        // make change while save is in progress
        todo.Description = 'Test mod';

        function success(data) {
            var aspect = todo.entityAspect;
            expect(aspect.entityState.name).to.equal('Unchanged',
                "added Todo was saved and now is Unchanged");
            expect(todo.Description).to.equal('Test',
                "description has the saved (not the modified) value");
        }
    });

    /*********************************************************
    * saves value in added entity that is changed while save in progress
    * then saved again before first save returns.
    * This test would fail in the 2nd assert in saveQueuing v.1; works in v.2
    *********************************************************/
    it("can save modified value during save of ADDED entity", function (done) {

        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges().catch(handleFail);

        // make change while save is in progress
        todo.Description = 'Test mod';

        // save immediately, before first save response
        return em.saveChanges()
          .then(success)
          .then(done, done);

        // After second save
        function success(data) {
            var aspect = todo.entityAspect;
            expect(aspect.entityState.name).to.equal('Unchanged',
                "modified Todo was saved and now is Unchanged");
            expect(todo.Description).to.equal('Test mod',
                "description has the modified value, changed between saves");
        }
    });

    /*********************************************************
    * saves same value in modified entity that is changed while save in progress
    * then saved again before first save returns.
    * This test would fail in the 2nd assert in saveQueuing v.1; works in v.2
    *********************************************************/
    it("saves SAME modified value of MODIFIED entity when saved before 1st save completes", function (done) {

        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges()
          .then(modAndSave)
          .then(done, done);

        function modAndSave(){
            // modify the existing Todo
            todo.Description = 'Test mod 1';

            // save the first mod
            em.saveChanges().catch(handleFail);

            // modify it again while the save is in progress
            todo.Description = 'Test mod 2';

            // save immediately, before first save response
            return em.saveChanges()
              .then(success).catch(handleFail);

            // After second save
            function success(data) {
                var aspect = todo.entityAspect;
                expect(aspect.entityState.name).to.equal('Unchanged',
                    "double modified Todo was saved and now is Unchanged");
                expect(todo.Description).to.equal('Test mod 2',
                    "description has the value modified during save");
            }
        }
    });

    /*********************************************************
    * saves different value in modified entity that is changed while save in progress
    * then saved again before first save returns.
    * This test would fail in the 2nd assert in saveQueuing v.1; works in v.2
    *********************************************************/
    it("saves DIFFERENT modified value of MODIFIED entity when saved before 1st save completes", function (done) {

        var todo = em.createEntity('TodoItem', {
            Description: 'Test',
            IsDone: false
        });
        em.saveChanges()
          .then(modAndSave)
          .then(requery)
          .then(success)
          .then(done, done);

        function modAndSave(){
            // modify the existing Todo
            todo.Description = 'Test mod 1';

            // save the first mod
            em.saveChanges().catch(handleFail);

            expect(todo.IsDone).to.equal(false,
                "isDone is false while 1st save in progress, just before mod");

            // modify different property while the 1st save is in progress
            todo.IsDone = true;

            // save now, before the first save response
            return em.saveChanges();
        }

        // 2nd save callback
        function requery(sr){
            em.clear(); // paranoia.
            return breeze.EntityQuery.from('Todos')
                .where('Id', 'eq', todo.Id)
                .using(em).execute();
        }

        function success(data) {
            todo = data.results[0];
            var aspect = todo.entityAspect;
            expect(aspect.entityState.name).to.equal('Unchanged',
                "double modified Todo was saved, requeried, and is Unchanged");
            expect(todo.Description).to.equal('Test mod 1',
                "description has the modified value, 'Test mod 1'");
            expect(todo.IsDone).to.equal(true,
                "isDone has the value modified (true) during 1st save");
        }
    });

    /*********************************************************
    * Two [add+save] events are in two separate saves
    *********************************************************/
    it("Two [add+save] events are in two separate saves", function (done) {

        var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .catch(handleFail);

        var todo2 = em.createEntity('TodoItem', { Description: "DeleteMe 2" });

        var save2 = em.saveChanges()
            .then(secondSaveSucceeded)
            .catch(handleFail);

        expect(em.getChanges().length, 2, "two pending changes while first save is in flight");

        Q.all([save1, save2])
            .then(bothSucceeded)
            .then(done, done);

        function firstSaveSucceeded(saveResult) {
            var savedCount = saveResult.entities.length;
            expect(savedCount).to.equal(1,
                    "1st save should save a single Todo");
            expect(saveResult.entities[0].Description)
                .to.equal(todo1.Description,
                    "1st save should be 'todo1'");
            return saveResult;
        }

        function secondSaveSucceeded(saveResult) {
            expect(saveResult.entities.length).to.equal(1,
                    "2nd save should save a single Todo");
            expect(saveResult.entities[0].Description)
                .to.equal(todo2.Description,
                    "2nd save should be 'todo2'");
            return saveResult;
        }
        function bothSucceeded (results) {
            expect(em.hasChanges()).to.equal(false,
                "should have no more pending changes");
        }
    });

    /*********************************************************
    * [add + save + (mod add, new add) + save] resaves first entity
    * Note that the re-save of the first add is a modify save
    *********************************************************/
    it("[add + save + (mod add, new add) + save] resaves first entity", function (done) {

        var description = 'Test' + ash.newGuid().toString();
        description = description.substr(0, 27); // max allowed is 30

        var todo1 = em.createEntity('TodoItem', { Description: description + '-1a' });

        var save1 = em.saveChanges().then(firstSaveSucceeded);

        var todo2 = em.createEntity('TodoItem', { Description: description + '-2a' });

        // make change to todo1 while it is being saved
        todo1.Description = description + '-1m';

        var save2 = em.saveChanges().then(secondSaveSucceeded);

        expect(em.getChanges()).to.have.length(2, "two pending changes while first save is in flight");

        Q.all([save1, save2])
            .then(requery)
            .then(confirm)
            .then(done, done);

        function firstSaveSucceeded(saveResult) {
            var saved = saveResult.entities;
            expect(saved).to.have.length(1, "1st save should save a single Todo");
            expect(saved).to.include(todo1, 'it should be todo1');

            return saveResult;
        }

        function secondSaveSucceeded(saveResult) {
            var ix, stateName;
            var saved = saveResult.entities;
            expect(saved).to.have.length(2, "2nd save should save two Todos");

            ix = saved.indexOf(todo1);
            expect(saved).to.include(todo1, 'one of them is todo1');
            stateName = getEntityStateOfSavedEntityInAjaxCall(1, ix);
            expect(stateName).to.equal('Modified', 'todo1 should have been a "Modified" save');

            ix = saved.indexOf(todo2);
            expect(saved).to.include(todo2, 'one of them is todo2');
            stateName = getEntityStateOfSavedEntityInAjaxCall(1, ix);
            expect(stateName).to.equal('Added', 'todo2 should have been a "Added" save');

            expect(em.hasChanges()).to.equal(false, "should have no more pending changes");

            return saveResult;
        }

        function requery(results) {
            return EntityQuery.from('Todos')
              .where('Description', 'startsWith', description)
              .using(em).execute();
        }

        function confirm(data) {
            var results = data.results;
            expect(results).to.have.length(2, 'should have requeried 2 Todos');

            var desc = todo1.Description;
            expect(desc).to.match(/-1m$/,
              'todo1 should have the modified description; is ' + desc);
        }
    });

    /*********************************************************
    * Queued saves will be combined but will not double-save
    * Here the 2nd and 3rd are combined while #1 is in-flight
    *********************************************************/
    it("Queued saves will be combined", function (done) {

        var description = 'Test' + ash.newGuid().toString();
        description=description.substr(0,28); // max allowed is 30

        em.createEntity('TodoItem', { Description: description + '-1' });
        var save1 = em.saveChanges();

        em.createEntity('TodoItem', { Description: description + '-2' });
        var save2 = em.saveChanges();

        em.createEntity('TodoItem', { Description: description + '-3' });
        var save3 = em.saveChanges();

        expect(em.getChanges().length).to.equal(3,
            "three pending changes while first save is in flight");

        Q.all([save1, save2, save3])
            .then(requery)
            .then(confirm)
            .then(done, done);

        function requery(results){
            var entities = em.getEntities();
            expect(entities.length, 3, 'should have exactly 3 in cache');
            expect(em.getChanges().length, 0, "should have no more pending changes");

            expect(ajaxSpy.callCount).to.equal(2,
                'ajax should have been called twice');

            var urlCalled = ajaxSpy.args[0][0].url;
            expect(urlCalled).to.match(/SaveChanges/,
                "1st time should have been SaveChanges; was "+urlCalled);

            urlCalled = ajaxSpy.args[1][0].url;
            expect(urlCalled).to.match(/SaveChanges/,
                "2nd time should have been SaveChanges; was "+urlCalled);

            return EntityQuery.from('Todos')
                .where('Description', 'startsWith', description)
                .using(em).execute();
        }

        function confirm(data) {
            var results = data.results;
            expect(results.length).to.equal(3,
                'should have re-queried 3 entities');
        }
    });

    /*********************************************************
    * A change that wasn't saved will not be saved by a queued save
    * Should only save entities with pending changes at the time
    * that saveChanges is called. Subsequent changes should
    * remain pending and not be saved by a queued save.
    *********************************************************/
    it("A change that wasn't saved will not be saved by a queued save", function (done) {

      var description = 'Test' + ash.newGuid().toString();
      description = description.substr(0, 27); // max allowed is 30

      em.createEntity('TodoItem', { Description: description + '-1a' });
      var save1 = em.saveChanges();

      em.createEntity('TodoItem', { Description: description + '-2a' });
      var save2 = em.saveChanges();

      var todo3 = em.createEntity('TodoItem', { Description: description + '-3a' });

      // NOT calling save on todo3; therefore it should NOT be saved

      expect(em.getChanges().length).to.equal(3, "three pending changes while first save is in flight");

      Q.all([save1, save2])
          .then(requery)
          .then(confirm)
          .then(done, done);

      function requery(results) {
        var entities = em.getEntities();
        expect(entities.length).to.equal(3, 'should have exactly 3 in cache');
        expect(em.getChanges().length).to.equal(1, "should have one more pending changes");

        var stateName = todo3.entityAspect.entityState.name;
        expect(stateName).to.equal('Added', 'todo3 remains in the "Added" state');

        return EntityQuery.from('Todos')
            .where('Description', 'startsWith', description)
            .using(em).execute();
      }

      function confirm(data) {
        var results = data.results;
        expect(results.length).to.equal(2, 'should have requeried 2 entities');
      }
    });

    /*********************************************************
    * After save, the added entities have empty originalValues
    *********************************************************/
    it("the added entities have empty originalValues after save", function (done) {

      var description = 'Test' + ash.newGuid().toString();
      description=description.substr(0,27); // max allowed is 30

      em.createEntity('TodoItem', { Description: description + '-1a' });
      var save1 = em.saveChanges();

      em.createEntity('TodoItem', { Description: description + '-2a' });
      var save2 = em.saveChanges();

      em.createEntity('TodoItem', { Description: description + '-3a' });
      var save3 = em.saveChanges();

      Q.all([save1, save2, save3])
          .then(confirm).then(done, done);

      function confirm() {
        var todos = em.getEntities();
        expect(todos).to.have.length(3, 'should have only the 3 added todos in cache');

        var noneHaveOriginalValues = todos.every(function (e) {
          return Object.keys(e.entityAspect.originalValues).length === 0;
        });

        expect(noneHaveOriginalValues).to.equal(true,
          'none of the saved entities have originalValues after save.');
      }
    });

    /*********************************************************
    * Cannot delete an ADDED or MODIFIED entity while it's being saved
    * This is standard behavior, w/ or w/o saveQueuing,
    * The exception is thrown when setDeleted() called
    * as of Breeze v.1.5.2
    *********************************************************/
    it("cannot delete an added entity while it's being saved", function (done) {

        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges()
          .then(function() { done(); }, done);

        var msgSuffix = ' to delete an added entity that is being saved';
        // try to delete the added entity before the save returns
        try {
          todo.entityAspect.setDeleted();
        } catch (err) {
          expect(err.message).to.match(/cannot.*being saved/i, 'should throw when try' + msgSuffix);
          return;
        }
        throw new AssertionError('can setDeleted when should not be able' + msgSuffix);
    });

    it("cannot delete a modified entity while it's being saved", function (done) {

      var todo = em.createEntity('TodoItem', {
        Description: 'Test',
        IsDone: false
      });

      em.saveChanges()
        .then(modifyAndSaveAndDelete)
        .then(done, done);

      function modifyAndSaveAndDelete() {
        todo.Description = 'Test mod';
        em.saveChanges();

        var msgSuffix = ' to delete a modified entity that is being saved';

        // try to delete the modified entity before the modify save returns
        try {
          todo.entityAspect.setDeleted();
        } catch (err) {
          expect(err.message).to.match(/cannot.*being saved/i, 'should throw when try' + msgSuffix);
          return;
        }
        throw new AssertionError('can setDeleted when should not be able' + msgSuffix);
      }

    });

    /*********************************************************
    * Failure in a middle save aborts the rest
    *********************************************************/
    it("Failure in a middle save aborts the rest", function (done) {

        var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });
        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .catch(handleFail);

        // fake a change to non-existent entity
        // save should fail
        var todo2 = em.createEntity('TodoItem', {
            Id: 100000, // not a real id
            Description: "DeleteMe 2"
        }, breeze.EntityState.Modified);

        var save2 = em.saveChanges()
            .then(secondSaveSucceeded)
            .catch(secondSaveFailed);

        var todo3 = em.createEntity('TodoItem', { Description: "DeleteMe 3" });
        var save3 = em.saveChanges()
        .then(thirdSaveSucceeded)
        .catch(thirdSaveFailed);

        expect(em.getChanges().length).to.equal(3,
            "three pending changes while first save is in flight");

        Q.all([save1, save2, save3])
            .then(postSave, postSave)
            .then(done, done);

        function firstSaveSucceeded(saveResult) {
            var savedCount = saveResult.entities.length;
            expect(savedCount).to.equal(1,
                    "1st save should save a single Todo");
            expect(saveResult.entities[0].Description)
                .to.equal(todo1.Description,
                    "1st save should be 'todo1'");
            return saveResult;
        }

        function secondSaveSucceeded(saveResult) {
            expect(true).to.equal(false, "the 2nd save should have failed");
        }
        function secondSaveFailed(error) {
            if (error.innerError) {error = error.innerError;}
            //console.log(
            //   "the 2nd save should have failed, the error was '{0}'"
            //    .format(error.message));
        }
        function thirdSaveSucceeded(saveResult) {
            expect(true).to.equal(false,
                "the 3rd save should have been aborted");
        }
        function thirdSaveFailed(error) {
            var msg = error.message;
            if (error.innerError) {error = error.innerError;}
            expect(msg).to.match(/queued save failed/i,
                "the 3rd save should have aborted with "+
                "queued save termination error: '{0}'"
                .format(error.message));
        }
        function postSave(results) {
            expect(typeof results[0]).to.equal('object',
                "1st save promise succeeded and has results");

            expect(typeof results[1] === 'undefined' &&
                typeof results[2] === 'undefined')
            .to.equal(true,
                "the 2nd and 3rd save promise results should be undefined " +
                "because failed saves were caught and errors not re-thrown");

            expect(todo1.entityAspect.entityState.name).to.equal("Unchanged",
                "'todo1' was saved and is in the 'Unchanged' state.");

            var changes = em.getChanges();
            expect(changes.indexOf(todo2)).to.be.above(-1,
                "todo2 is among the pending changes");
            expect(changes.indexOf(todo3)).to.be.above(-1,
                "todo3 is among the pending changes");
        }
    });

    /*********************************************************
    * Failure in first save aborts the rest
    *********************************************************/
    it("Failure in first save aborts the rest", function (done) {

        // fake a change to non-existent entity
        // save should fail
        em.createEntity('TodoItem', {
            Id: 100000, // not a real id
            Description: "DeleteMe 1"
        }, breeze.EntityState.Modified);

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .catch(firstSaveFailed);

        em.createEntity('TodoItem', { Description: "DeleteMe 2" });
        var save2 = em.saveChanges()
            .then(laterSaveSucceeded)
            .catch(laterSaveFailed);

        em.createEntity('TodoItem', { Description: "DeleteMe 3" });
        var save3 = em.saveChanges()
            .then(laterSaveSucceeded)
            .catch(laterSaveFailed);

        expect(em.getChanges().length).to.equal(3,
            "three pending changes while first save is in flight");

        Q.all([save1, save2, save3])
         .then(allDone)
         .then(done, done);

        function firstSaveSucceeded(saveResult) {
            expect(true).to.equal(false,
                "the 1st save should have failed");
        }
        function firstSaveFailed(error) {
            //console.log("the 1st save should have failed, the error was '{0}'"
            //   .format(error.message));
        }
        function laterSaveSucceeded(saveResult) {
            expect(true).to.equal(false,
                "any save after the 1st should have been aborted");
        }
        function laterSaveFailed(error) {
            expect(error.message).to.match(/queued save failed/i,
               "any save after the 1st should have aborted with " +
               "queued save termination error: '{0}'"
               .format(error.message));
        }

        function allDone(results) {
            var allResultsUndefined = results.reduce(
                    function(p, c) { return p && typeof c === 'undefined'; },
                    true);

            expect(allResultsUndefined).to.equal(true,
                "all save promise results should be undefined because " +
                "failed saves were caught and errors not re-thrown");

            expect(em.getChanges().length).to.equal(3,
                "all three entities should still have pending changes");
        }
    });

    /*********************************************************
    * Validation error in later queued save aborts earlier queued saves
    *********************************************************/
    it("Validation error in later queued save aborts earlier queued saves", function (done) {

        var todo1 = em.createEntity('TodoItem', { Description: 'Test 1' });
        var save1 = em.saveChanges()
            .catch(firstSaveFailed);

        // queue second save of two valid entities
        todo1.Description = 'Test 1m';
        var todo2 = em.createEntity('TodoItem', { Description: 'Test 2' });
        var save2 = em.saveChanges();

        // invalid because todo3 lacks required Description
        var todo3 = em.createEntity('TodoItem');
        todo3.entityAspect.validateEntity();
        var errors = todo3.entityAspect.getValidationErrors();
        expect(errors.length).to.equal(1,
            'todo3 should have one validation error: ' + errors[0].errorMessage);

        // try save ... which should fail for todo3
        // but also fails for todo1 and todo2
        var save3 = em.saveChanges();

        Q.all([save1, save2, save3])
           .then(allPassed)
           .catch(reviewFailed)
           .then(done, done);

        function firstSaveFailed(error) {
          throw new AssertionError("the 1st save should have succeeded, error was " + error.message);
        }
        function allPassed(resolvedValues) { // BAD!
          throw new AssertionError('all saves passed but 2nd/3rd should have failed');
        }

        function reviewFailed(error) {
            expect(error.message).to.match(/queued save failed/i,
                 "any save after the 1st should have aborted with " +
                 "queued save termination error: '{0}'"
                 .format(error.message));

            // `error.failedSaveMemo` is the saveMemo that prompted this save
            // `error.pendingSaveMemo` holds unsaved changes accumulated since that save.
            // You may try to recover using this info. Good luck with that.
            // It is gone forever after this moment.
            var failedSaveMemo = error.failedSaveMemo;
            expect(!!failedSaveMemo).to.equal(true,
                'can access the `failedSaveMemo` on the `error`');

            var memoKeys = Object.keys(failedSaveMemo.entityMemos);
            expect(memoKeys).to.have.length(1,
                '`saveMemo.entityMemos` has the pending changes to Todo1');

            var queuedChanges = failedSaveMemo.queuedChanges;
            expect(queuedChanges).to.contain(todo2,
                '`saveMemo.queuedChanges` holds todo2');
            expect(queuedChanges).to.contain(todo3,
                '`saveMemo.queuedChanges` holds todo3');
        }
    });

    //////// helpers ////////////

    function getEntityStateOfSavedEntityInAjaxCall(call, entityIndex) {
        entityIndex = (entityIndex == null) ? 0 : entityIndex;
        return JSON.parse(ajaxSpy.getCall(call).args[0].data).entities[entityIndex].entityAspect.entityState;
    }
});