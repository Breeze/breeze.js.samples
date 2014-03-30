var testFns = (function () {
    'use strict';

    window.testing = true;

    var prep = ngSpecPrep;

    var serviceRoot = window.location.protocol + '//' + window.location.host + '/';
    var serviceName = serviceRoot + 'breeze/Breeze';
    var testMetadataStore = createTestMetadataStore();

    createApiTestModule();

    //TODO: Add server ping test because a common cause of failure is that
    //      I forgot to start the server first.

    var fns = {
        clearDataContext: clearDataContext,
        clearTester: prep.clearTester,
        createController: createController,
        createRepository: createRepository,
        failed: prep.failed,
        newEm: newEm,
        prepareAsyncSpec: prepareAsyncSpec,
        prepareDataContext: prepareDataContext,
        prepareEntityManagerFactory: prepareEntityManagerFactory,
        prepareSpec: prepareSpec,
        primeTheManager: primeTheManager,
        serviceName: serviceName,
        serviceRoot: serviceRoot,
        setManagerToFetchFromCache: setManagerToFetchFromCache,
        setManagerToFetchFromServer: setManagerToFetchFromServer
    };

    return fns;

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/

    /*********************************************************
     * Creates a new Angular Module for pure Breeze Web API Testing
     * DOES NOT WORK FOR MEAN YET
     *********************************************************/
    function createApiTestModule() {
        return angular.module('APITest', [
            'environment',    // the test environment. for now, the mean or swan stacks
            'breeze.angular'
        ]).run(['breeze', function(breeze) {
            breeze.NamingConvention.camelCase.setAsDefault();
        }]);
    }

    /*******************************************************
     * Detach all entities, clear the manager, and clear the datacontext
     *******************************************************/
    function clearDataContext(specContext) {
        if (specContext.manager) {
            specContext.manager.clear(); // detach entities manager's entities
            specContext.manager = null;  // free to GC            
        }
        specContext.datacontext = null;
    }

    /*******************************************************
    * Create a controller given the spec's context object, 
    * the name of the controller, and optionally any ctorArgs.
    *
    * usage:
    *   createController(specCtx, 'Sessions');
    *
    *   ctrl = testFns.createController(specContext, 'sessions', ctorArgs);
    *
    ********************************************************/
    function createController(specContext, name, ctorArgs) {
        ctorArgs = ctorArgs || {};
        ctorArgs.datacontext = ctorArgs.datacontext || specContext.datacontext;
        ctorArgs.$scope = ctorArgs.$scope || specContext.createScope();
        var ctrl = specContext.controllerFactory(name, ctorArgs);
        specContext.flush();
        return ctrl;
    }

    /*********************************************************
     * Create the test metadataStore with metadata
     * loaded from metadata.js.
     *
     * Creates fake validators that are CC app specific.
     * We need the fake validators because validators 
     * are referred to in the metadata.
     *********************************************************/
    function createTestMetadataStore() {
        var store = new breeze.MetadataStore();
        fakeCustomValidators();
        store.importMetadata(window.testdata.metadataStore);
        if (!store.hasMetadataFor(serviceName)) {
            store.addDataService(new breeze.DataService({ serviceName: serviceName }));
        }
        return store;

        // Temporarily register fakes for the custom validators in model.validation
        // just so we can load canned metadata which specifies them.
        // If they are not registered, metadata import throws an exception.
        // These fakes are replaced when model.validation runs.
        function fakeCustomValidators() {
            var registry = breeze.config.functionRegistry;
            var Validator = breeze.Validator;
            registerFakeValidator('requireReferenceEntity');
            registerFakeValidator('twitter');

            function registerFakeValidator(name) {
                if (!registry["Validator." + name]) {
                    Validator.register(
                        new Validator(name, function () { return true; }));
                }
            }
        }
    }

    /*******************************************************
     * Convenience function to create a repo in the tests.
     * Get the named Repository Ctor (by injection), new it, and initialize it
     ********************************************************/
    function createRepository(specContext, repoName) {
        //throw new Error("deliberate error");
        var fullRepoName = 'repository.' + repoName.toLowerCase();
        var factory = specContext.inject(fullRepoName);
        var repo = factory.create(specContext.manager);
        return repo;
    }

    /*********************************************************
     * EntityManager factory
     *********************************************************/
    function newEm() {
        return new breeze.EntityManager({
            serviceName: fns.serviceName,
            metadataStore: testMetadataStore
        });
    }

    /*******************************************************
     * Setup for all tests that call a datacontext
     * and use a breeze.EntityManager with mock data.
     * specContexts lookups and speaker partials in the entity manager.
     * Tell breeze to only query locally.
     *******************************************************/
    function prepareDataContext(specContext) {
        prepareEntityManagerFactory(specContext);

        specContext.datacontext = specContext.inject('datacontext');
    }

    /*******************************************************
     * Setup for all tests that need a breeze.EntityManager 
     * with mock data.
     * Tell breeze to only query locally.
     *******************************************************/
    function prepareEntityManagerFactory(specContext) {
        // Purpose: Setup the EntityManager

        // set the service name BEFORE it is injected into the entityManagerFactory
        var configBreeze = specContext.inject('configBreeze');
        configBreeze.remoteServiceName = serviceName;

        // Here we get the emFactory and ensure it returns a test-ready EntityManager
        var emFactory = specContext.inject('entityManagerFactory');
        specContext.entityManagerFactory = emFactory;

        // Wrap the emFactory's newManager method
        // so it gets primed with lookup data and
        // fetches from cache (rather than remote) by default
        var origNewManager = emFactory.newManager;
        emFactory.newManager = function () {
            var mgr = origNewManager();
            // Prime the data and set the metadata
            primeTheManager(mgr);
            // 'prevent' remote queries
            setManagerToFetchFromCache(mgr);
            specContext.manager = mgr;
            return mgr;
        };
    }
    
    function prepareSpec(specContext) {
        var ctx = prep.prepareSpec(specContext);
        ctx.logger = stubTheLogger(specContext);
        return ctx;
    }

    function prepareAsyncSpec(specContext) {
        var ctx = prep.prepareAsyncSpec(specContext);
        ctx.logger = stubTheLogger(specContext);
        return ctx;
    }

    /*******************************************************
     * Setup for all sync tests
     *******************************************************/
    function primeTheManager(manager) {
        var svcName = fns.serviceName;
        var metastore = manager.metadataStore;
        if (!metastore.hasMetadataFor(svcName)) {
            // Import Metadata from file
            metastore.importMetadata(testdata.metadataStore);
            // Set the service name too
            metastore.addDataService(new breeze.DataService({ serviceName: svcName }));
        }
        manager.importEntities(testdata.prime);
    }

    /*******************************************************
     * In sync tests we want queryies to fetch from server by default
     *******************************************************/
    function setManagerToFetchFromCache(manager) {
        manager.setProperties({
            queryOptions: new breeze.QueryOptions({
                // query the cache by default
                fetchStrategy: breeze.FetchStrategy.FromLocalCache
            })
        });
    }
    /*******************************************************
     * In async tests we want queryies to fetch from cache by default
     *******************************************************/
    function setManagerToFetchFromServer(manager) {
        manager.setProperties({
            queryOptions: new breeze.QueryOptions({
                // query the cache by default
                fetchStrategy: breeze.FetchStrategy.FromServer
            })
        });
    }
    /*******************************************************
    * Use sinon to replace (almost) all methods with stubs
    * Preserves the `getLogFn` method implementation and spies on it 
    *
    * usage:
    *
    *     loggerStub = stubTheLogger(specContext); 
    *
    *     // assert on the stub later in the tests
    *     ...
    *     sinon.assert.calledWithExactly(loggerStub.log, msg, data, moduleId, true);
    *
    ********************************************************/
    function stubTheLogger(specContext) {
        var logger = specContext.inject('logger');
        // replace the real logger members with sinon stubs
        var stub = sinon.stub(logger);
        stub.getLogFn.restore();  // don't stub this method
        sinon.spy(stub.getLogFn); // but do spy on it
        return stub;
    }
})();