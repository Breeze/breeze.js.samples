/* jshint -W117, -W030 */
/*********************************************************
 * testFns reduces boilerplate repetition in tests
 * initial version copied from DocCode
 * modified for ngDocCode
 *********************************************************/
// ReSharper disable InconsistentNaming

(function (docCode, specHelper) {
    'use strict';

    // extend native String with format, startsWith, endsWith
    // Ex: '{0} returned {1} item(s)'.format(queryName, count));
    extendString();

    var _nextIntId = 10000; // seed for getNextIntId()

    var wellKnownData = {
        // ID of the Northwind 'Alfreds Futterkiste' customer
        alfredsID: '785efa04-cbf2-4dd7-a7de-083ee17b6ad2',
        // ID of the Northwind 'Nancy Davolio' employee
        nancyID: 1,
        // Key values of a Northwind 'Alfreds Futterkiste''s OrderDetail
        alfredsOrderDetailKey: { OrderID: 10643, ProductID: 28 /*Rössle Sauerkraut*/ },
        // ID of Chai product
        chaiProductID: 1
    };
    /*********************************************************
     * testFns - the module object
     *********************************************************/
    var serverRoot = 'http://localhost:58066/' // DocCode Web API server

    var testFns = {
        assertIsSorted: assertIsSorted,
        breeze: breeze,
        customerResultsToStringArray: customerResultsToStringArray,
        ensureIsEm: ensureIsEm,
        foosMetadataServiceName: serverRoot + 'breeze/FoosMetadata',
        getNextIntId: getNextIntId,
        getParserForUrl: getParserForUrl,
        getValidationErrMsgs: getValidationErrMsgs,
        promiseSaveFailed: promiseSaveFailed,
        importMetadata: importMetadata,
        importNorthwindMetadata: importNorthwindMetadata,
        inheritancePurge: inheritancePurge, // empty the Inheritance Model db completely
        inheritanceReset: inheritanceReset, // reset to known state
        inheritanceServiceName: 'breeze/inheritance',
        morphString: morphString,
        morphStringProp: morphStringProp,
        newEmFactory: newEmFactory,
        newGuid: newGuid,
        newGuidComb: newGuidComb,
        northwindDtoServiceName: serverRoot + 'breeze/NorthwindDto',
        northwindDtoNamespace: 'Northwind.DtoModels',
        northwindNamespace: 'Northwind.Models',
        northwindReset: northwindReset, // reset Northwind db to known state
        northwindServiceName: serverRoot + 'breeze/Northwind',
        output: output,
        populateMetadataStore: populateMetadataStore,
        reportRejectedPromises: reportRejectedPromises,
        rootUri: getRootUri(),
        serverIsRunningPrecondition: serverIsRunningPrecondition,
        serverRoot: serverRoot,
        todosPurge: todosPurge, // empty the Todos db completely
        todosReset: todosReset, // reset to known state
        todosServiceName: serverRoot + 'breeze/todos',
        userSessionId: newGuidComb(),
        wellKnownData: wellKnownData
    };

    createTestAppModule();

    docCode.testFns = testFns;

    return;

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
            // ensure breeze is configured for angular
            .run(function(breeze){
                initAjaxAdapter();
            });

        function initAjaxAdapter() {
            // get the current default Breeze AJAX adapter
            var ajaxAdapter = breeze.config.getAdapterInstance('ajax');
            ajaxAdapter.defaultSettings = {
                headers: {
                    'X-UserSessionId': testFns.userSessionId
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
        var $http;
        inject(function($http){
            $http = _$http_;
        });
        return $http;
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

    /*********************************************************
     * Callback for promise success and failures in Mocha
     * NASTY. See https://github.com/mad-eye/meteor-mocha-web/issues/70
     *********************************************************/
    // Usage:  manager.saveChanges.catch(promiseSaveFailed(done))
    function promiseSaveFailed(done) {
        return function(error){
            error.message = 'Save failed: ' + getSaveErrorMessages(error);
            done(error);
        }
    }

    // Import metadata into an entityManager or metadataStore
    // and optionally set the store's dataService
    // Usage:
    //     testFns.importMetadata(manager, testFns.northwindMetadata, testFns.northwindServiceName)
    //     testFns.importMetadata(someMetadataStore, testFns.northwindMetadata)
    function importMetadata(metadataStore, metadata, dataService) {
        if (!metadata){
            throw new Error('testFns#importMetadata: no metadata to import');
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
    //     testFns.importNorthwindMetadata(manager)
    //     testFns.importNorthwindMetadata(someMetadataStore)
    function importNorthwindMetadata(metadataStore) {
        importMetadata(metadataStore, docCode.northwindMetadata, testFns.northwindServiceName );
    }

    /**************************************************
     * Pure Web API calls aimed at the InheritanceController
     * Does NOT STOP/START the test runner!
     **************************************************/
    function inheritancePurge() {
        var $http = get$http();
        return $http.post(testFns.inheritanceServiceName + '/purge',{});
    }

    function inheritanceReset() {
        var $http = get$http();
        return $http.post(testFns.inheritanceServiceName + '/reset',{});
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
     * Factory of EntityManager factories (newEm functions)
     *********************************************************/
        // Creates newEm(), a typical function for making new EntityManagers (an EM factory)
        // usage:
        //    var serviceName = testFns.northwindServiceName,
        //        newEm = testFns.emFactory(serviceName);
        //    ...
        //    var em = newEm();
    function newEmFactory(serviceName) {
        var factory = function () {
            return new breeze.EntityManager(factory.options);
        };
        factory.options = {
            serviceName: serviceName,
            // every module gets its own metadataStore; they do not share the default
            metadataStore: new breeze.MetadataStore()
        };
        return factory;
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
     * Pure Web API calls aimed at the NorthwindController
     * Does NOT STOP/START the test runner!
     **************************************************/
    function northwindReset(fullReset) {
        var $http = get$http();
        var queryString = fullReset ? '/?options=fullreset' : '';
        return $http.post(testFns.northwindServiceName + '/reset' + queryString,{
            headers: { 'X-UserSessionId': testFns.userSessionId }
        });
    }

    function output(text) {
        document.body.appendChild(document.createElement('pre')).innerHTML = text;
    }

    /*********************************************************
     * Populate an EntityManager factory's metadataStore
     *********************************************************/
        // Keep a single copy of the metadataStore in this module
        // and reuse it with each new EntityManager
        // so we don't make repeated requests for metadata
        // every time we create a new EntityManager
    function populateMetadataStore(newEm, metadataSetupFn) {

        var metadataStore = newEm.options.metadataStore;

        // Check if the module metadataStore is empty
        if (!metadataStore.isEmpty()) {
            return breeze.Q(true); // ok ... it's been populated ... we're done.
        }

        // It's empty; get metadata
        var serviceName = newEm.options.serviceName;

        return metadataStore.fetchMetadata(serviceName)
            .then(function () {
                if (typeof metadataSetupFn === 'function') {
                    metadataSetupFn(metadataStore);
                }
            })
            .fail(handleFail);
    }

    function reportRejectedPromises(promises) {
        // No equivalent in $q
        throw new Error('\'reportRejectedPromises\' not implemented');
    }

    function serverIsRunningPrecondition(){
        before(function(done){
            if (testFns.isServerRunning){
                done();
            } else {
                done(new Error("Server is not running; can't run these specs"));
            }
        });
    }

    /**************************************************
     * Pure Web API calls aimed at the TodosController     *
     * Does NOT STOP/START the test runner!
     **************************************************/
    function todosPurge() {
        var $http = get$http();
        return $http.post(testFns.todosServiceName + '/purge',{});
    }

    function todosReset() {
        var $http = get$http();
        return $http.post(testFns.todosServiceName + '/reset',{});
    }

})( window.docCode || (window.docCode={}), window.specHelper);
