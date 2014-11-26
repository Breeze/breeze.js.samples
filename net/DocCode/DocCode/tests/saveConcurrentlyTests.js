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
    moduleOptions.teardown = testFns.teardown_todosReset;
    
    /*********************************************************
    * Module demonstrates behavior of EntityManager
    * when its saveChanges method is called again 
    * before the prior call has returned.
    * These are not tests of conflicting saves by different users
    *********************************************************/
    module("saveConcurrentlyTests", moduleOptions);

    /*********************************************************
    * concurrent save throws exceptions by default
    *********************************************************/
    test("Concurrent save throws exceptions by default", function () {
        expect(2);
        var em = newEm();
        // add new Todo (not interest in the item)
        em.createEntity('TodoItem', { Description: "DeleteMe" });

        stop(); // going async ... tell the testrunner to wait

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .fail(handleFail); // shouldn't fail

        var save2 = em.saveChanges()
            .then(secondSaveSucceeded)
            .fail(secondSaveFailed);

        Q.all([save1, save2])
         .fail(handleFail) // unexpected
         .fin(start); // resume tests after both promises

        function firstSaveSucceeded(saveResult) {
            ok(true, "1st save of the entity should succeed");
        }
        function secondSaveSucceeded(saveResult) {
            ok(false, "second save should not succeed");
        }
        function secondSaveFailed(error) {
            var expected = /concurrent[\s]*saves not allowed/i;
            ok(expected.test(error.message),     
               "should reject second save; error was '{0}'"
               .format(error.message));
        }
    });

    /*********************************************************
    * second save w/ 'allowConcurrentSaves' 
    * saves a new entity twice!
    * That is terrible! 
    * DON'T USE THIS FEATURE UNLESS YOU KNOW WHY
    *********************************************************/
    test("Concurrent save w/ 'allowConcurrentSaves' saves a new entity twice",
        function () {
        expect(4);
        var em = newEm();
        var description = "DeleteMe";
        em.createEntity('TodoItem', { Description: description });
        var saveSuccessCount = 0;
            
        var saveOptions =
            new breeze.SaveOptions({ allowConcurrentSaves: true }); // BAD IDEA
               
        stop(); // going async ... tell the testrunner to wait

        var save1 = em.saveChanges(null, saveOptions)
            .then(saveSucceeded)
            .fail(saveFailed); 

        var save2 = em.saveChanges(null, saveOptions)
            .then(saveSucceeded)
            .fail(saveFailed); 

        Q.all([save1, save2])
         .fail(handleFail) // unexpected
         .fin(afterAll); // resume tests after both promises

        function saveSucceeded(saveResult) {
            equal(saveSuccessCount +=1, 1,
                "One of the saves should succeed");
        }

        // second save then fails during key fixup
        function saveFailed(error) {
            equal(saveSuccessCount += 1, 2,
                "Second save should fail on the client");
            
            var expected = /key fixup.*unable to locate/i;
            ok(expected.test(error.message),
               "2nd save of same entity fails on client " +
               "only because of id fixup error: '{0}'"
               .format(error.message));
        }

        function afterAll() {
            EntityQuery.from('Todos')
                .where('Description', 'eq', description)
                .using(em).execute()
                .then(afterAllQuerySucceeded)
                .fail(handleFail)
                .fin(start);
        }
        function afterAllQuerySucceeded(data) {
            equal(data.results.length, 2,
                "In fact the single new Todo was saved twice; " +
                "should find 2 Todos in the database with its '" +
                description + "' description."
            );
        }
    });

    /*********************************************************
    * concurrent save with separate managers is ok
    * as if two different users saved concurrently
    *********************************************************/
    test("Concurrent save with separate managers is ok", function () {
        expect(5);
        var em1 = newEm();
        var em2 = newEm();

        // add a new Todo to each manager
        var todo1 = em1.createEntity('TodoItem', { Description: "DeleteMe 1" });
        var todo2 = em2.createEntity('TodoItem', { Description: "DeleteMe 2" });

        stop(); // going async ... tell the testrunner to wait

        var save1 = em1.saveChanges()
            .then(firstSaveSucceeded)
            .fail(handleFail); // shouldn't fail

        var save2 = em2.saveChanges()
            .then(secondSaveSucceeded)
            .fail(handleFail); // shouldn't fail

        Q.all([save1, save2])
         .then(bothSucceeded)
         .fail(handleFail) // unexpected
         .fin(start); // resume tests after both promises

        function firstSaveSucceeded(saveResult) {
            ok(true, "1st save of the entity in em1 should succeed");
            return saveResult;
        }
        function secondSaveSucceeded(saveResult) {
            ok(true, "2nd save of the entity in em2 should succeed");
            return saveResult;
        }
        function bothSucceeded(promises) {
            ok(!em1.hasChanges(), "em1 should have no more pending changes");
            ok(!em2.hasChanges(), "em2 should have no more pending changes");
            notEqual(todo1.entityAspect.entityManager,
                     todo2.entityAspect.entityManager,
                     "the newly saved todos are in different manager");
        }
    });

})(docCode.testFns);