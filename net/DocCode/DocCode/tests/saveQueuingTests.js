// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup
    *********************************************************/
   // Classes we'll need from the breeze namespaces
    var EntityQuery = breeze.EntityQuery;
    var handleFail = testFns.handleFail;

    // Name of each type's query endpoint in the persistence service

    // Target the Todos service
    var serviceName = testFns.todosServiceName;
    var newEm = testFns.newEmFactory(serviceName);
    var moduleOptions = testFns.getModuleOptions(newEm);

    var ajaxAdapter = breeze.config.getAdapterInstance('ajax');

    // reset Todos db and adapter after each test because
    // we're messing them up
    moduleOptions.teardown = function() {
        if (ajaxAdapter.ajax.restore) { ajaxAdapter.ajax.restore();}
        testFns.teardown_todosReset();
    };

    /*=========== SaveQueuing Module ===================*/
    module("saveQueuing", moduleOptions);

    /*********************************************************
    * second save w/ savequeuing does not resave
    *********************************************************/
    asyncTest("Second save w/ savequeuing does not resave", function () {
        expect(4);
        var ajaxSpy = sinon.spy(ajaxAdapter, 'ajax');
        var em = newEm();
        em.enableSaveQueuing(true); // <--

        var description = 'Test'+testFns.newGuid().toString();
        description=description.substr(0,30); // max allowed
        em.createEntity('TodoItem', { Description: description });

        var save1 = em.saveChanges();
        var save2 = em.saveChanges();

        Q.all([save1, save2])
         .then(requery)
         .then(success)
         .fail(handleFail)
         .fin(start);

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
        var em = newEm();
        em.enableSaveQueuing(true); // <--

        var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .fail(handleFail);

        var todo2 = em.createEntity('TodoItem', { Description: "DeleteMe 2" });

        var save2 = em.saveChanges()
            .then(secondSaveSucceeded)
            .fail(handleFail);

        equal(em.getChanges().length, 2, "two pending changes while first save is in flight");

        Q.all([save1, save2])
            .then(bothSucceeded)
            .fail(handleFail)
            .fin(start);

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
        var ajaxSpy = sinon.spy(ajaxAdapter, 'ajax');

        var em = newEm();
        em.enableSaveQueuing(true); // <--

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
            .fail(handleFail)
            .fin(start);

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
        expect(8);
        var em = newEm();
        em.enableSaveQueuing(true); // <--

        var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });
        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .fail(handleFail);

        // fake a change to non-existent entity
        // save should fail
        var todo2 = em.createEntity('TodoItem', {
            Id: 100000, // not a real id
            Description: "DeleteMe 2"
        }, breeze.EntityState.Modified);

        var save2 = em.saveChanges()
            .then(secondSaveSucceeded)
            .fail(secondSaveFailed);

        var todo3 = em.createEntity('TodoItem', { Description: "DeleteMe 3" });
        var save3 = em.saveChanges()
        .then(thirdSaveSucceeded)
        .fail(thirdSaveFailed);

        equal(em.getChanges().length, 3, "three pending changes while first save is in flight")

        Q.all([save1, save2, save3])
            .then(allSucceeded)
            .fin(allOver); // resume tests after both promises

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
        function allSucceeded(promises) {
            ok(typeof promises[1] === 'undefined' &&
                typeof promises[1] === 'undefined',
                "the 2nd and 3rd promise should be undefined because " +
                "failed saves were caught and errors not re-thrown");
        }
        function allOver() {
            equal(todo1.entityAspect.entityState.name, "Unchanged",
                "'todo1' was saved and is in the 'Unchanged' state.");
            equal(em.getChanges().length, 2,
                "latter two entities should still have pending changes");
            start();
        }
    });

    /*********************************************************
    * Failure in first save aborts the rest
    *********************************************************/
    asyncTest("Failure in first save aborts the rest", function () {
        expect(6);
        var em = newEm();
        em.enableSaveQueuing(true); // <--

        // fake a change to non-existent entity
        // save should fail
        em.createEntity('TodoItem', {
            Id: 100000, // not a real id
            Description: "DeleteMe 1"
        }, breeze.EntityState.Modified);

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .fail(firstSaveFailed);

        em.createEntity('TodoItem', { Description: "DeleteMe 2" });
        var save2 = em.saveChanges()
            .then(laterSaveSucceeded)
            .fail(laterSaveFailed);

        em.createEntity('TodoItem', { Description: "DeleteMe 3" });
        var save3 = em.saveChanges()
            .then(laterSaveSucceeded)
            .fail(laterSaveFailed);

        equal(em.getChanges().length, 3, "three pending changes while first save is in flight");

        Q.all([save1, save2, save3])
         .then(allSucceeded)
         .fin(start); 

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