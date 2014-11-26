// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
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
        setup: function () { 
            ajaxSpy = sinon.spy(ajaxAdapter, 'ajax');
            testFns.populateMetadataStore(newEm); 
            em = newEm();
            em.enableSaveQueuing(true); // <--
        },
        teardown: function () { 
            // reset Todos db and adapter after each test because
            // we're messing them up
            ajaxSpy.restore();
            testFns.teardown_todosReset();
        }
    };
    module("saveQueuing", moduleOptions);

    /*********************************************************
    * overwrites value in added entity that is changed while saving
    * when that save completes before the modified entity is saved
    * This is standard behavior, w/ or w/o saveQueuing
    *********************************************************/
    asyncTest("save overwrites value of entity modified while saving", function () {
        expect(2);

        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges()
          .then(success).catch(handleFail).finally(start);

        // make change while save is in progress
        todo.setProperty('Description', 'Test mod');

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
    asyncTest("saves modified value of added entity when saved before 1st save completes", function () {
        expect(2);

        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges().catch(handleFail);

        // make change while save is in progress
        todo.setProperty('Description', 'Test mod');

        // save immediately, before first save response
        return em.saveChanges()          
          .then(success).catch(handleFail).finally(start);

        // After second save
        function success(data) {
            var aspect = todo.entityAspect;
            equal(aspect.entityState.name, 'Unchanged',
                "modified Todo was saved and now is Unchanged");
            equal(todo.getProperty('Description'), 'Test mod',
                "description has the modified value, changed between saves");
        }
    });

    /*********************************************************
    * saves value in modified entity that is changed while save in progress
    * then saved again before first save returns.
    * This test would fail in the 2nd assert in saveQueuing v.1; works in v.2
    *********************************************************/
    asyncTest("saves modified value of modified entity when saved before 1st save completes", function () {
        expect(2);

        var todo = em.createEntity('TodoItem', { Description: 'Test' });
        em.saveChanges()
          .then(modAndSave)
          .catch(handleFail).finally(start);

        function modAndSave(){
            // modify the existing Todo
            todo.setProperty('Description', 'Test mod 1');

            // save the first mod
            em.saveChanges().catch(handleFail);

            // modify it again while the save is in progress
            todo.setProperty('Description', 'Test mod 2'); 
                      
            // save immediately, before first save response
            return em.saveChanges()          
              .then(success).catch(handleFail);

            // After second save
            function success(data) {
                var aspect = todo.entityAspect;
                equal(aspect.entityState.name, 'Unchanged',
                    "double modified Todo was saved and now is Unchanged");
                equal(todo.getProperty('Description'), 'Test mod 2',
                    "description has the 2nd modified value");
            }
        }
    });
    /*********************************************************
    * second save w/ savequeuing does not resave
    *********************************************************/
    asyncTest("Second save w/ savequeuing does not resave", function () {
        expect(4);

        var description = 'Test'+testFns.newGuid().toString();
        description=description.substr(0,30); // max allowed
        em.createEntity('TodoItem', { Description: description });

        var save1 = em.saveChanges();
        var save2 = em.saveChanges();

        Q.all([save1, save2])
         .then(requery)
         .then(success)
         .catch(handleFail)
         .finally(start);

        function requery(results){
            equal(ajaxSpy.callCount, 1,
                'ajax should only have been called once .. for a single save');

            var urlCalled = ajaxSpy.args[0][0].url;
            ok(/SaveChanges/.test(urlCalled),
                "should have called SaveChanges; was "+urlCalled);

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
    * Two [add+save] events are in two separate saves
    * The saves are in order
    *********************************************************/
    asyncTest("Two [add+save] events are in two separate saves", function () {
        expect(6);

        var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .catch(handleFail);

        var todo2 = em.createEntity('TodoItem', { Description: "DeleteMe 2" });

        var save2 = em.saveChanges()
            .then(secondSaveSucceeded)
            .catch(handleFail);

        equal(em.getChanges().length, 2, "two pending changes while first save is in flight");

        Q.all([save1, save2])
            .then(bothSucceeded)
            .catch(handleFail)
            .finally(start);

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
            var savedCount = saveResult.entities.length;
            equal(savedCount, 1,
                    "2nd save should save a single Todo");
            equal(saveResult.entities[0].Description(), todo2.Description(),
                    "2nd save should be 'todo2'");
            return saveResult;
        }
        function bothSucceeded (results) {
            ok(!em.hasChanges(), "should have no more pending changes");
        }
    });

    /*********************************************************
    * Queued saves will be combined but will not double-save
    * Here the 2nd and 3rd are combined while #1 is in-flight
    *********************************************************/
    asyncTest("Queued saves will be combined", function () {
        expect(7);

        var description = 'Test'+testFns.newGuid().toString();
        description=description.substr(0,28); // max allowed is 30

        em.createEntity('TodoItem', { Description: description + '-1' });
        var save1 = em.saveChanges();

        em.createEntity('TodoItem', { Description: description + '-2' });
        var save2 = em.saveChanges();

        em.createEntity('TodoItem', { Description: description + '-3' });
        var save3 = em.saveChanges();

        equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

        Q.all([save1, save2, save3])
            .then(requery)
            .then(confirm)
            .catch(handleFail)
            .finally(start);

        function requery(results){
            var entities = em.getEntities();
            equal(entities.length, 3, 'should have exactly 3 in cache');
            equal(em.getChanges().length, 0, "should have no more pending changes");

            equal(ajaxSpy.callCount, 2,
                'ajax should have been called twice');

            var urlCalled = ajaxSpy.args[0][0].url;
            ok(/SaveChanges/.test(urlCalled),
                "1st time should have been SaveChanges; was "+urlCalled);

            urlCalled = ajaxSpy.args[1][0].url;
            ok(/SaveChanges/.test(urlCalled),
                "2nd time should have been SaveChanges; was "+urlCalled);

            return EntityQuery.from('Todos')
                .where('Description', 'startsWith', description)
                .using(em).execute();
        }

        function confirm(data) {
            var results = data.results;
            equal(results.length, 3, 'should have requeried 3 entities');
        }
    });

    /*********************************************************
    * Failure in a middle save aborts the rest
    *********************************************************/
    asyncTest("Failure in a middle save aborts the rest", function () {
        expect(9);

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

        equal(em.getChanges().length, 3, "three pending changes while first save is in flight")

        Q.all([save1, save2, save3])
            .then(postSave, postSave)
            .finally(start);

        function firstSaveSucceeded(saveResult) {
            var savedCount = saveResult.entities.length;
            equal(savedCount, 1,
                    "1st save should save a single Todo");
            equal(saveResult.entities[0].Description(), todo1.Description(),
                    "1st save should be 'todo1'");
            return saveResult;
        }

        function secondSaveSucceeded(saveResult) {
            ok(false, "the 2nd save should have failed");
        }
        function secondSaveFailed(error) {
            ok(true,
                "the 2nd save should have failed, the error was '{0}'"
                .format(error.message));
        }
        function thirdSaveSucceeded(saveResult) {
            ok(false, "the 3rd save should have been aborted");
        }
        function thirdSaveFailed(error) {
            var expected = /queued save failed/i;
            ok(expected.test(error.message),
                "the 3rd save should have aborted with "+
                "queued save termination error: '{0}'"
                .format(error.message));
        }
        function postSave(results) {
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
    asyncTest("Failure in first save aborts the rest", function () {
        expect(6);

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

        equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

        Q.all([save1, save2, save3])
         .then(allSucceeded)
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

        function allSucceeded(results) {
            ok(results.reduce(
                    function(p, c) { return p && typeof c === 'undefined'; },
                    true),
                "all save promise results should be undefined because " +
                "failed saves were caught and errors not re-thrown");

            equal(em.getChanges().length, 3,
                "all three entities should still have pending changes");
        }
    });

})(docCode.testFns);