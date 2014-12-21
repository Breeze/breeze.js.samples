/* jshint -W117, -W030, -W071 */
/*********************************************************
 * ash - appSpecHelper - common values and functions for application specs
 * Reduces repetition in application tests
 * Based on DocCode's "testFns";  modified for ngDocCode
 *********************************************************/
// ReSharper disable InconsistentNaming

(function () {
    'use strict';

    var _nextIntId = 10000; // seed for getNextIntId()
    var $injector;  // for ash exclusive use; not the one used by a local test
    var serverMetadata = {}; // server-side metadata retrieved during current test session
    var serverRoot = 'http://localhost:58066/'; // DocCode's Web API server

    // extend native String with format, startsWith, endsWith
    // Ex: '{0} returned {1} item(s)'.format(queryName, count));
    extendString();
    useAngularAdapters();

    /*********************************************************
     * ash - the module object
     *********************************************************/

    var ash = {
        alfredsID: '785efa04-cbf2-4dd7-a7de-083ee17b6ad2', // Northwind 'Alfreds Futterkiste' customer ID
        //  a Northwind 'Alfreds Futterkiste' Order's OrderDetail Key for Rössle Sauerkraut
        alfredsOrderDetailKey: { OrderID: 10643, ProductID: 28 },
        // AjaxAdapterTestInterceptor: AjaxAdapterTestInterceptor.js
        assertIsSorted: assertIsSorted,
        asyncModule: bard.asyncModule,
        breeze: breeze,
        chaiProductID: 1, // Chai product ID
        customerResultsToStringArray: customerResultsToStringArray,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        ensureIsEm: ensureIsEm,
        fakeRouteProvider: bard.fakeRouteProvider,
        foosMetadataServiceName: serverRoot + 'breeze/FoosMetadata',
        getNextIntId: getNextIntId,
        getParserForUrl: getParserForUrl,
        getValidationErrMsgs: getValidationErrMsgs,
        gotResults: gotResults,
        gotNoResults: gotNoResults,
        handleSaveFailed: handleSaveFailed,
        importMetadata: importMetadata,
        importNorthwindMetadata: importNorthwindMetadata,
        inheritancePurge: inheritancePurge, // empty the Inheritance Model db completely
        inheritanceReset: inheritanceReset, // reset to known state
        inheritanceServiceName: 'breeze/inheritance',
        injector: bard.injector,
        morphString: morphString,
        morphStringProp: morphStringProp,
        nancyID: 1, // Northwind 'Nancy Davolio' employee ID
        newEmFactory: newEmFactory,
        newGuid: newGuid,
        newGuidComb: newGuidComb,
        // northwindDtoMetadata: northwindDtoMetadata.js
        northwindDtoServiceName: serverRoot + 'breeze/NorthwindDto',
        northwindDtoNamespace: 'Northwind.DtoModels',
        // northwindMetadata: northwindMetadata.js
        northwindNamespace: 'Northwind.Models',
        northwindReset: northwindReset, // reset Northwind db to known state
        northwindServiceName: serverRoot + 'breeze/Northwind',
        // northwindTestData: northwindTestData.js
        output: output,
        preFetchMetadataStore: preFetchMetadataStore,
        replaceAccentChars: bard.replaceAccentChars,
        reportRejectedPromises: reportRejectedPromises,
        rootUri: getRootUri(),
        serverIsRunningPrecondition: serverIsRunningPrecondition,
        serverMetadata: serverMetadata,
        serverRoot: serverRoot,
        setupNgMidwayTester: setupNgMidwayTester,
        todosPurge: todosPurge, // empty the Todos db completely
        todosReset: todosReset, // reset to known state
        todosServiceName: serverRoot + 'breeze/todos',
        userSessionId: newGuidComb(),
        verifyNoOutstandingHttpRequests: bard.verifyNoOutstandingHttpRequests
    };
    window.ash = window.appSpecHelper = ash;

    createTestAppModule();

    ///////////////////////
    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/

    /*********************************************************
     * assert that the collection of entities is sorted properly on one property
     *********************************************************/
    function assertIsSorted(collection, propertyName, isDescending, isCaseSensitive) {
        isCaseSensitive = isCaseSensitive == null ? true : isCaseSensitive;
        var fn = function (a, b) {
            // localeCompare has issues in Chrome.
            // var compareResult = a[propertyName].localeCompare(b.propertyName);
            var av = a.getProperty(propertyName);
            var bv = b.getProperty(propertyName);
            if (typeof av === 'string' && !isCaseSensitive) {
                av = av.toLowerCase();
                bv = (bv || '').toLowerCase();
            }
            var compareResult = av < bv ? -1 : (av > bv ? 1 : 0);
            return isDescending ? compareResult * -1 : compareResult;
        };
        var arrayCopy = collection.map(function (o) { return o; });
        arrayCopy.sort(fn);
        if (!breeze.core.arrayEquals(collection, arrayCopy)){
            expect('Spec failed').to.be(propertyName + ' not sorted correctly');
        }
    }

    function createTestAppModule(){
        return angular.module('testApp',['breeze.angular'])
            // ensure breeze is configured for angular for THIS particular module
            .run(function(breeze){
                initAjaxAdapter();
            });

        function initAjaxAdapter() {
            // get the current default Breeze AJAX adapter
            var ajaxAdapter = breeze.config.getAdapterInstance('ajax');
            ajaxAdapter.defaultSettings = {
                headers: {
                    'X-UserSessionId': ash.userSessionId
                }
            };
        }
    }

    function customerResultsToStringArray(data, limit) {
        var count = data.results.length;
        var results = (limit) ? data.results.slice(0, limit) : data.results;
        var out = results.map(function (c) {
            return '({0}) {1} in {2}, {3}'.format(
                c.CustomerID(), c.CompanyName(), c.City(), (c.Region() || 'null'));
        });
        if (count > out.length) { out.push('...'); }
        return out;
    }

    //    function customerResultsToHtml(data, limit) {
    //        var results = customerResultsToStringArray(data, limit).join('</li><li>');
    //        return (results.length) ? '<ol><li>' + results + '</li></ol>' : '[none]';
    //    }

    /*********************************************************
     * Get or Create an EntityManager
     *********************************************************/
        // get an EntityManager from arg (which is either an em or an em factory)
    function ensureIsEm(em) {
        if (!(em instanceof breeze.EntityManager)) {
            return em(); // assume it's an EntityManager factory, e.g. 'newEm'.
        }
        return em;
    }

    /*******************************************************
     * String extensions
     * Monkey punching JavaScript native String class
     * w/ format, startsWith, endsWith
     * go ahead and shoot me but it's convenient
     ********************************************************/
    function extendString() {
        var stringFn = String.prototype;

        // Ex: '{0} returned {1} item(s)'.format(queryName, count));
        stringFn.format = stringFn.format || function () {
            var s = this;
            for (var i = 0, len = arguments.length; i < len; i++) {
                var reg = new RegExp('\\{' + i + '\\}', 'gm');
                s = s.replace(reg, arguments[i]);
            }

            return s;
        };

        stringFn.endsWith = stringFn.endsWith || function (suffix) {
            return (this.substr(this.length - suffix.length) === suffix);
        };

        stringFn.startsWith = stringFn.startsWith || function (prefix) {
            return (this.substr(0, prefix.length) === prefix);
        };

        stringFn.contains = stringFn.contains || function (value) {
            return (this.indexOf(value) !== -1);
        };
    }

    /*********************************************************
     * get $http from active angular application module
     *********************************************************/
    function get$http(){
        var http;
        $injector.invoke(function($http){ http = $http; });
        return http;
    }

    /*********************************************************
     * Generate the next new integer Id
     *********************************************************/
    function getNextIntId() {
        return _nextIntId++;
    }

    function getParserForUrl(url) {
        var parser = document.createElement('a');
        parser.href = url;
        return parser;
        // See https://developer.mozilla.org/en-US/docs/DOM/HTMLAnchorElement
        //parser.href = 'http://example.com:3000/pathname/?search=test#hash';
        //parser.protocol; // => 'http:'
        //parser.hostname; // => 'example.com'
        //parser.port;     // => '3000'
        //parser.pathname; // => '/pathname/'
        //parser.search;   // => '?search=test'
        //parser.hash;     // => '#hash'
        //parser.host;     // => 'example.com:3000'
    }

    function getRootUri() {
        var parser = getParserForUrl(document.documentUri);
        return parser.protocol + '//' + parser.host + '/';
    }

    function getSaveErrorMessages(error) {
        var msg = error.message;
        var detail = error.detail;
        if (error.entityErrors) {
            return getValidationMessages(error);
        } else if (detail) {
            if (detail.ExceptionType &&
                detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
                // Concurrency error
                return 'Another user, perhaps the server, ' +
                    'may have changed or deleted an entity in the change-set.';
            } else {
                return 'Server ' + detail.ExceptionMessage + '\nStackTrace: ' + detail.StackTrace;
            }
        }
        return msg;
    }

    /*********************************************************
     * Return an entity's validation error messages as a string
     *********************************************************/
    function getValidationErrMsgs(entity) {
        var errs = entity.entityAspect.getValidationErrors();
        return errs.length ?
            errs.map(function (err) { return err.errorMessage; }).join(', ') :
            'no errors';
    }

    function getValidationMessages(error) {

        // Failed on client during pre-Save validation
        try {
            return error.entityErrors.map(function (entityError) {
                return entityError.errorMessage;
            }).join(', \n');

            // No longer supported.
            //return error.entitiesWithErrors.map(function (entity) {
            //    return entity.entityAspect.getValidationErrors().map(function (valError) {
            //        return valError.errorMessage;
            //    }).join(', \n');
            //}).join('; \n');
        }
        catch (e) {
            return 'validation error (error parsing exception :\'' + e.message + '\')';
        }
    }

    function gotResults (data) {
        expect(data.results).is.not.empty;
    }

    function gotNoResults(data) {
        expect(data.results).is.empty;
    }

    // Import metadata into an entityManager or metadataStore
    // and optionally set the store's dataService
    // Usage:
    //     ash.importMetadata(manager, ash.northwindMetadata, ash.northwindServiceName)
    //     ash.importMetadata(someMetadataStore, ash.northwindMetadata)
    function importMetadata(metadataStore, metadata, dataService) {
        if (!metadata){
            throw new Error('ash#importMetadata: no metadata to import');
        }
        if (!metadataStore){
            metadataStore = new breeze.MetadataStore();
        } else if (metadataStore instanceof breeze.EntityManager){
            // gave us an EM; get the store from there
            var em = metadataStore;
            metadataStore = em.metadataStore;
            dataService = em.dataService;
        }
        metadataStore.importMetadata(metadata);

        // optionally associate these metadata data with the dataService
        if (dataService) {
            if (typeof dataService === 'string'){ // given dataService name
                dataService = new breeze.DataService({ serviceName: dataService });
            }
            metadataStore.addDataService(dataService);
        }
    }

    // Import NorthwindMetadata from script into an entityManager or metadataStore
    // Usage:
    //     ash.importNorthwindMetadata(manager)
    //     ash.importNorthwindMetadata(someMetadataStore)
    function importNorthwindMetadata(metadataStore) {
        importMetadata(metadataStore, ash.northwindMetadata, ash.northwindServiceName );
    }

    function inheritancePurge() {
        return webApiCommand(ash.inheritanceServiceName, 'purge');
    }

    /**************************************************
     * Reset the Inheritance controller (the data it governs)
     * Usage:
     *   afterEach(function (done) {
     *      ash.inheritanceReset().then(done, done);
     *   });
     **************************************************/
    function inheritanceReset() {
        return webApiCommand(ash.inheritanceServiceName, 'reset');
    }

    function morphStringProp(entity, propName) {
        var val = entity.getProperty(propName);
        var newVal = morphString(val);
        entity.setProperty(propName, newVal);
        return newVal;
    }

    function morphString(str) {
        if (!str) {
            return '_X';
        }
        if (str.length > 1 && breeze.core.stringEndsWith(str, '_X')) {
            return str.substr(0, str.length - 2);
        } else {
            return str + '_X';
        }
    }

    /*********************************************************
     * returns an EntityManager factory for a given serviceName
     * The manager created by that factory will be populated with metadata for that service
     * Might invoke an async `before` hook if has to get the metadata from the server
     *
     * Usage:
     *    // Called inside a `describe`, typically the file's outermost `describe`
     *    var serviceName = ash.northwindServiceName,
     *        newEm = ash.newEmFactory(serviceName); // the factory
     *    ...
     *    var em = newEm(); // use factory to create a manager.
     *********************************************************/
    function newEmFactory(serviceName) {
        var dataService = new breeze.DataService({serviceName: serviceName});
        var metadataStore = ash.preFetchMetadataStore(dataService);
        return function() {
            return new breeze.EntityManager({dataService: dataService, metadataStore: metadataStore});
        };
    }

    /*********************************************************
     * Generate a new Guid Id
     *********************************************************/
    function newGuid() {
        return breeze.core.getUuid();
    }

    /*********************************************************
     * Generate a new GuidCOMB Id
     * @method newGuidComb {String}
     * @param [n] {Number} Optional integer value for a particular time value
     * if not supplied (and usually isn't), n = new Date.getTime()
     *********************************************************/
    function newGuidComb(n) {
        // Create a pseudo-Guid whose trailing 6 bytes (12 hex digits) are timebased
        // Start either with the given getTime() value, n, or get the current time in ms.
        // Each new Guid is greater than next if more than 1ms passes
        // See http://thatextramile.be/blog/2009/05/using-the-guidcomb-identifier-strategy
        // Based on breeze.core.getUuid which is based on this StackOverflow answer
        // http://stackoverflow.com/a/2117523/200253
        // Convert time value to hex: n.toString(16)
        // Make sure it is 6 bytes long: ('00'+ ...).slice(-12) ... from the rear
        // Replace LAST 6 bytes (12 hex digits) of regular Guid (that's where they sort in a Db)
        // Play with this in jsFiddle: http://jsfiddle.net/wardbell/qS8aN/
        var timePart = ('00' + (n || (new Date().getTime())).toString(16)).slice(-12);
        return 'xxxxxxxx-xxxx-4xxx-yxxx-'.replace(/[xy]/g, function (c) {
            /* jshint bitwise:false, eqeqeq:false */
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            /* jshint bitwise:true, eqeqeq:true */
            return v.toString(16);
        }) + timePart;
    }

    /**************************************************
     * Reset the Northwind controller (the data it governs)
     * Usage:
     *   afterEach(function (done) {
     *      ash.northwindReset().then(done, done);
     *   });
     **************************************************/
    function northwindReset(fullReset) {
        var command = fullReset ? 'reset/?options=fullreset' : 'reset';
        return webApiCommand(
                ash.northwindServiceName,
                command,
                {headers: {'X-UserSessionId': ash.userSessionId}}
            );
    }

    function output(text) {
        document.body.appendChild(document.createElement('pre')).innerHTML = text;
    }

    // Guarantees that the metadataStore for a given dataService
    // is populated with metadata for that dataService retrieved from the server during this test session
    // Those metadata are cached and reused during the test session to reduce server requests for metadata
    function preFetchMetadataStore(dataService, metadataStore){
        if (typeof(dataService) === 'string' ){
            dataService = new breeze.DataService();
        }
        if (dataService instanceof breeze.DataService){
            if (!metadataStore) {
                metadataStore = new breeze.MetadataStore();
            }
            if (metadataStore.isEmpty()){
                var metadata = serverMetadata[dataService.serviceName];
                if (metadata){
                    metadataStore.importMetadata(metadata);
                    metadataStore.addDataService(dataService);
                } else {
                    preFetchMetadataInBeforeHook(dataService, metadataStore);
                }
            }
            return metadataStore;
        } else {
            throw new Error('preFetchMetadataStore failed: "dataService" must be a string or a breeze.DataService.');
        }

        function preFetchMetadataInBeforeHook(){
            before(function(done){
                metadataStore.fetchMetadata(dataService)
                    .then(function(data){
                        metadataStore.addDataService(dataService, true);
                        serverMetadata[dataService.serviceName] = JSON.stringify(data);
                        done();
                    }, done);
            });
        }
    }

    /*********************************************************
     * Callback for saveChanges promise failure
     *********************************************************/
    // Usage:
    //    manager.saveChanges().catch(handleSaveFailed).then(done, done);
    function handleSaveFailed() {
        return function(error){
            error.message = 'Save failed: ' + getSaveErrorMessages(error);
            throw error; // re-throw the error
        };
    }

    function reportRejectedPromises(promises) {
        // No equivalent in $q
        throw new Error('\'reportRejectedPromises\' not implemented');
    }

    /*********************************************************
     * Determine if the server is running so that midway tests can run.
     * No point in running them if the server is not up.
     * Place the following near the top of each midway spec file
     *     ash.serverIsRunningPrecondition();
     * Calls a mocha `before` hook that pings the server
     * Caches the result of the ping so that subsequent midway spec files don't re-ping
     * @method serverIsRunningPrecondition {String}
     *********************************************************/
    function serverIsRunningPrecondition(){
        //Todo: allow the server to vary
        var serviceName = ash.northwindServiceName;
        var notRunningError = new Error('Server '+serviceName+' is NOT running; can\'t run these specs');

        before(function(done){
            if (ash.isServerRunning === undefined){
                this.timeout(32000);
                $injector.invoke(function ($http, $rootScope) {
                    var url = serviceName+'/employees?$top=0';
                    // fire one in to kick the server... not sure why this is necessary
                    $http.get(url);
                    // Now we really test this one
                    $http.get(url, {timeout: 30000})// just looking for a response
                        .then(function(){
                            ash.isServerRunning = true;
                            console.log('Server '+serviceName+' is running');
                            done();
                        })
                        .catch(function(res){
                            if (res.status === 0 ){
                                ash.isServerRunning = false;
                                done(notRunningError);
                            } else {
                                // something else is wrong but the server is up and that's all we care about here
                                ash.isServerRunning = true;
                                console.error('Unexpected error while looking for server: '+res.data);
                            }
                        });
                });
            } else if (ash.isServerRunning){
                done();
            } else {
                done(notRunningError);
            }
        });
    }

    /**************************************************
     * Setup/teardown async ngMidwayTester via beforeEach/afterEach
     * returns the tester for use by the specs
     * call tester() inside your test to get that current tester object
     **************************************************/
    function setupNgMidwayTester() {
        var args = arguments;
        var tester;
        beforeEach(function() {
            tester = ngMidwayTester.apply(ngMidwayTester, args);
        });
        afterEach(function () {
            if (tester) { tester.destroy(); }
        });
        return function(){return tester;};
    }

    function todosPurge() {
        return webApiCommand(ash.todosServiceName, 'purge');
    }

    /**************************************************
     * Reset the Todos controller (the data it governs)
     * Usage:
     *   afterEach(function (done) {
     *      ash.todosReset().then(done, done);
     *   });
     **************************************************/
    function todosReset() {
        return webApiCommand(ash.todosServiceName, 'reset');
    }

    function useAngularAdapters(){
        // initialize an injector we can use inside appbard.
        // and initialize Breeze to use Angular
        // NB: during tests, Breeze uses different Ng service instances!
        $injector = angular.injector(['ng', 'breeze.angular']);
        $injector.invoke(function(breeze){});
    }

    /**************************************************
     * Pure Web API commands to a controller (POST)
     * Does NOT STOP/START the test runner!
     * Typically embedded in a service/command wrapper method
     *
     * Usage:
     *   function todoReset(){
     *       return webApiCommand(ash.todoServiceName, 'reset');
     *   }
     *
     *   afterEach(function (done) {
     *      ash.todoReset().then(done, done);
     *   });
     **************************************************/
    function webApiCommand(serviceName, command, config) {
        var $http = get$http();
        return $http
            .post(serviceName + '/' + command, {}, config)
            .then(function(res){
             }); // break here to examine response;
    }

})( );
