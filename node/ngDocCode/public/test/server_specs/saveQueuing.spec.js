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
    * Cannot delete an ADDED entity while it's being saved
    * This is standard behavior, w/ or w/o saveQueuing,
    * The exception is thrown when setDeleted() called
    * as of Breeze v.1.5.2
    *********************************************************/
    it("cannot delete an ADDED entity while it's being saved", function (done) {

        var startCalled = false;
        var setDeletedThrew = false;
        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges()
          .then(success).catch(failedDuringPostSave)
          .then(done, done);

        try {
            todo.entityAspect.setDeleted();
        } catch (e) {
            setDeletedThrew = true;
        }

        function success(data) {
            expect(setDeletedThrew).to.equal(true, 
                "save should have failed after catching setDeleted() error.");
        }

        function failedDuringPostSave(error){
            if (error.innerError) {error = error.innerError;}
            expect(true).to.equal(false, 
                "post save processing failed; msg was "+error.message);
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
    * second save w/ savequeuing does not resave an added entity
    *********************************************************/
    it("second save does not duplicate-save the added entity", function (done) {

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
            expect(ajaxSpy.callCount, 1,
                'ajax should only have been called once .. for a single save');

            var urlCalled = ajaxSpy.args[0][0].url;
            expect(urlCalled).to.match(/SaveChanges/,
                "should have called SaveChanges; was "+urlCalled);

            return EntityQuery.from('Todos')
                .where('Description', 'eq', description)
                .using(em).execute();
        }

        function success(data) {
            expect(data.results.length).to.equal(1,
                "Re-queried exactly one TodoItem w/ that description.");
            expect(em.getEntities().length).to.equal(1, 
                "Only one entity in cache");
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

});