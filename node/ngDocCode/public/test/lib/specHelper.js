/*jshint -W079, -W101, -W117*/
(function() {
    var specHelper = {
        $httpBackend: $httpBackendReal,
        $q: $qReal,
        asyncModule: asyncModule,
        fakeRouteProvider: fakeRouteProvider,
        flush: flush,        
        injector: injector,
        gotResults: gotResults,
        gotNoResults: gotNoResults,
        replaceAccentChars: replaceAccentChars,
        verifyNoOutstandingHttpRequests: verifyNoOutstandingHttpRequests
    };
    window.specHelper = specHelper;

    ////////////////////////
    /**
     *  Replaces the ngMock'ed $httpBackend with the real one from ng thus
     *  restoring the ability to issue AJAX calls to the backend with $http.
     *
     *  This alternative to the ngMidwayTester preserves the ngMocks feature set
     *  while restoring $http calls that pass through to the server
     *
     *  Note that $q remains ngMocked so you must flush $http calls ($rootScope.$digest).
     *  The specHelper.flush() function is available for this purpose.
     * 
     *  Could restore $q with $qReal in which case don't need to flush. 
     * 
     *  Inspired by this StackOverflow answer:
     *    http://stackoverflow.com/questions/20864764/e2e-mock-httpbackend-doesnt-actually-passthrough-for-me/26992327?iemail=1&noredirect=1#26992327
     *
     *  Usage:
     *  
     *    var myService;
     *
     *    beforeEach(module(specHelper.$httpBackend, 'app');
     *
     *    beforeEach(inject(function( _myService_) {
     *        myService = _myService_;
     *    }));
     * 
     *    it('should return valid data', function(done) {
     *        myService.remoteCall()
     *            .then(function(data) {
     *                expect(data).toBeDefined();
     *            })
     *            .then(done, done);
     * 
     *        // because not using $qReal, must flush the $http and $q queues
     *        specHelper.flush();
     *    });        
     */
    function $httpBackendReal($provide) {
        $provide.provider('$httpBackend', function() {
            this.$get = function() {
                return angular.injector(['ng']).get('$httpBackend');
            };
        });
    }


    /**
     *  Replaces the ngMock'ed $q with the real one from ng thus 
     *  obviating the need to flush $http and $q queues
     *  at the expense of ability to control $q timing.
     *
     *  This alternative to the ngMidwayTester preserves the other ngMocks features
     *
     *  Usage:
     *  
     *    var myService;
     *
     *    // Consider: beforeEach(specHelper.asyncModule('app'));
     *
     *    beforeEach(module(specHelper.$q, specHelper.$httpBackend, 'app');
     *
     *    beforeEach(inject(function( _myService_) {
     *        myService = _myService_;
     *    }));
     * 
     *    it('should return valid data', function(done) {
     *        myService.remoteCall()
     *            .then(function(data) {
     *                expect(data).toBeDefined();
     *            })
     *            .then(done, done);
     *
     *        // not need to flush
     *    });        
     */
    function $qReal($provide) {
        $provide.provider('$q', function() {
            this.$get = function() {
                return angular.injector(['ng']).get('$q');
            };
        });
    }

    /**
     * Prepare ngMocked module definition that makes real $http and $q calls
     * Use it as you would the ngMocks#module method
     * 
     *  Useage:
     *     beforeEach(specHelper.asyncModule('app'));
     *
     *     // Equivalent to:
     *     //   beforeEach(module(specHelper.$q, specHelper.$httpBackend, 'app', specHelper.fakeLogger));
     */
    function asyncModule(){
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift($qReal, $httpBackendReal); // prepend real replacements for mocks
        // build and return the ngMocked test module
        return angular.mock.module.apply(angular.mock.module, args); 
    }

    function fakeRouteProvider($provide) {
        /**
         * Stub out the $routeProvider so we avoid
         * all routing calls, including the default route
         * which runs on every test otherwise.
         * Make sure this goes before the inject in the spec.
         */
        $provide.provider('$route', function() {
            /* jshint validthis:true */
            this.when = sinon.stub();
            this.otherwise = sinon.stub();

            this.$get = function() {
                return {
                    // current: {},  // fake before each test as needed
                    // routes:  {}  // fake before each test as needed
                    // more? You'll know when it fails :-)
                };
            };
        });
    }

    /**
     * Flush the pending $http and $q queues with a digest cycle
     */
    function flush(fn){
        inject(function ($rootScope){ $rootScope.$apply(fn);});
    }

    /**
     * Inspired by Angular; that's how they get the parms for injection
     */
    function getFnParams (fn) {
        var fnText;
        var argDecl;

        var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
        var FN_ARG_SPLIT = /,/;
        var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var params = [];
        if (fn.length) {
            fnText = fn.toString().replace(STRIP_COMMENTS, '');
            argDecl = fnText.match(FN_ARGS);
            angular.forEach(argDecl[1].split(FN_ARG_SPLIT), function(arg) {
                arg.replace(FN_ARG, function(all, underscore, name) {
                    params.push(name);
                });
            });
        }
        return params;
    }

    function gotResults (data) {
        expect(data.results).is.not.empty;
    }

    function gotNoResults(data) {
        expect(data.results).is.empty;
    }

    // Replaces the accented characters of many European languages w/ unaccented chars
    // Use it in JavaScript string sorts where such characters may be encountered
    // Matches the default string comparers of most databases.
    // Ex: replaceAccentChars(a.Name) < replaceAccentChars(b.Name)
    // instead of:            a.Name  <                    b.Name
    function replaceAccentChars(s) {
        var r = s.toLowerCase();
        r = r.replace(new RegExp(/[àáâãäå]/g), 'a');
        r = r.replace(new RegExp(/æ/g), 'ae');
        r = r.replace(new RegExp(/ç/g), 'c');
        r = r.replace(new RegExp(/[èéêë]/g), 'e');
        r = r.replace(new RegExp(/[ìíîï]/g), 'i');
        r = r.replace(new RegExp(/ñ/g), 'n');
        r = r.replace(new RegExp(/[òóôõö]/g), 'o');
        r = r.replace(new RegExp(/œ/g), 'oe');
        r = r.replace(new RegExp(/[ùúûü]/g), 'u');
        r = r.replace(new RegExp(/[ýÿ]/g), 'y');
        return r;
    }

    /**
     * inject selected services into the windows object during test
     * then remove them when test ends.
     *
     * spares us the repetition of creating common service vars and injecting them
     *
     * See avengers-route.spec for example
     */
    function injector () {
        var annotation,
            body = '',
            cleanupBody = '',
            mustAnnotate = false,
            params;

        if (typeof arguments[0] === 'function') {
            params = getFnParams(arguments[0]);
        }
        // else from here on assume that arguments are all strings
        else if (angular.isArray(arguments[0])) {
            params = arguments[0];
        }
        else {
            params = Array.prototype.slice.call(arguments);
        }

        annotation = params.join('\',\''); // might need to annotate

        angular.forEach(params, function(name, ix) {
            var _name,
                pathName = name.split('.'),
                pathLen = pathName.length;

            if (pathLen > 1) {
                // name is a path like 'block.foo'. Can't use as identifier
                // assume last segment should be identifier name, e.g. 'foo'
                name = pathName[pathLen - 1];
                mustAnnotate = true;
            }

            _name = '_' + name + '_';
            params[ix] = _name;
            body += name + '=' + _name + ';';
            cleanupBody += 'delete window.' + name + ';';

            // todo: tolerate component names that are invalid JS identifiers, e.g. 'burning man'
        });

        var fn = 'function(' + params.join(',') + '){' + body + '}';

        if (mustAnnotate) {
            fn = '[\'' + annotation + '\',' + fn + ']';
        }

        var exp = 'inject(' + fn + ');' +
            'afterEach(function(){' + cleanupBody + '});'; // remove from window.

        /* jshint evil:true */
        new Function(exp)(); // the assigned vars will be global. `afterEach` will remove them
    }

    function verifyNoOutstandingHttpRequests () {
        afterEach(inject(function($httpBackend) {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        }));
    }
})();
