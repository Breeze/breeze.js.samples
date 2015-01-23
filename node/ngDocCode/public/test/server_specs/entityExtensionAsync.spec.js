/* jshint -W117, -W030, -W109 */
// ReSharper disable InconsistentNaming
describe('entityExtensionAsync:', function() {
    'use strict';

    ash.serverIsRunningPrecondition();

    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityState = breeze.EntityState;
    var MetadataStore = breeze.MetadataStore;
    var moduleMetadataStore = new MetadataStore();
    var northwindService = ash.northwindServiceName;
    var todoService = ash.todosServiceName;

    var alfredsQuery = EntityQuery.from('Customers')
                                .where('CustomerID', 'eq', ash.alfredsID);

    var nancyQuery = EntityQuery.from('Employees')
                                .where('EmployeeID', 'eq', ash.nancyID);

    beforeEach(function (done) {
        if (!moduleMetadataStore.isEmpty()) {
            done(); // got it already
            return;
        }
        breeze.Q.all([
            moduleMetadataStore.fetchMetadata(northwindService),
            moduleMetadataStore.fetchMetadata(todoService)
        ]).then(function() { done(); }, done);
    });

    describe("when querying with a custom ctor", function(){
        var emp;
        before(function(done){

            var employeeCtor = function () {
                this.FirstName = 'Jolly'; // Mapped property
                this.FunkyName = 'Fresh'; // Unmapped property
            };

            var store = cloneModuleMetadataStore();
            store.registerEntityTypeCtor('Employee', employeeCtor);

            newEm(store)
                .executeQuery(nancyQuery)
                .then(function(data){ emp = data.results[0]; })
                .then(done, done);
        });

        it("the ctor does not change the EntityState", function () {
            var aspect = emp.entityAspect;
            expect(aspect.entityState.isUnchanged()).to.equal(true,
                "queried entity whose ctor sets properties should remain Unchanged");
            expect(aspect.originalValues).to.be.empty;
        });

        it("queried values overwrite the ctor default mapped property value", function () {
            expect(emp.FirstName).to.not.equal('Jolly',
                "queried value should overwrite ctor default FirstName; is " + emp.FirstName);
        });

        it("ctor default unmapped property values are retained", function () {
            expect(emp.FunkyName).to.equal('Fresh',
                "unmapped 'FunkyName' should have stayed 'Fresh'");
        });
    });

    describe("when querying with an initializer", function(){
        var emp;
        before(function(done){

            var employeeInitializer = function (emp) {
                emp.FirstName = 'Jolly'; // Mapped property
                emp.FunkyName = 'Fresh'; // Untracked property
            };

            var store = cloneModuleMetadataStore();
            store.registerEntityTypeCtor('Employee', null, employeeInitializer);

            newEm(store)
                .executeQuery(nancyQuery)
                .then(function(data){ emp = data.results[0]; })
                .then(done, done);
        });

        it("the initializer does not change the EntityState", function () {
            var aspect = emp.entityAspect;
            expect(aspect.entityState.isUnchanged()).to.equal(true,
                "queried entity whose initializer sets properties should remain Unchanged");
            expect(aspect.originalValues).to.be.empty;
        });

        it("initialized mapped property values should overwrite queried values", function () {
            expect(emp.FirstName).to.equal('Jolly',
                "init'er should overwrite queried FirstName; is " + emp.FirstName);
        });

        it("initialized untracked property values are retained", function () {
            expect(emp.FunkyName).to.equal('Fresh',
                "untracked 'FunkyName' should have stayed 'Fresh'");
        });
    });

    /*********************************************************
    * unmapped properties are not persisted
    * (although they are sent to the server in the payload)
    *********************************************************/
    it("unmapped properties are not persisted", function (done) {

        var TodoItemCtor = function () {
            this.foo = 123;
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('TodoItem', TodoItemCtor);

        // Create manager that uses this extended TodoItem
        var manager = new EntityManager({
            serviceName: todoService,
            metadataStore: store
        });

        // create new Todo
        var todo = manager.createEntity('TodoItem');
        var operation, description; // testing capture vars

        saveAddedTodo()
            .then(saveModifiedTodo)
            .then(saveDeletedTodo)
            .then(done, done);

        function saveAddedTodo() {
            changeDescription('add');
            todo.foo = 42;
            return manager.saveChanges().then(saveSucceeded);
        }
        function saveModifiedTodo() {
            changeDescription('update');
            todo.foo = 84;
            return manager.saveChanges().then(saveSucceeded);
        }
        function saveDeletedTodo() {
            changeDescription('delete');
            todo.foo = 21;
            todo.entityAspect.setDeleted();
            return manager.saveChanges().then(saveSucceeded);
        }

        function changeDescription(op) {
            operation = op;
            description = op + ' entityExtensionAsync';
            todo.Description = description;
        }

        function saveSucceeded() {

            expect(todo.foo).to.not.equal(0,
                "'foo' should have retained its '{0}' value after '{1}' save succeeded"
                .format(todo.foo, operation));

            // clear the cache and requery the Todo
            manager.clear();
            return EntityQuery
                .fromEntities(todo)
                .using(manager).execute()
                .then(requerySucceeded);
        }

        function requerySucceeded(data) {
            todo = data.results[0];

            if (operation === "delete") {
                expect(todo == null).to.equal(true,
                    "should not fetch todo after 'delete' save succeeds");

            } else {
                expect(todo != null).to.equal(true,
                    "todo should still be in the database after '"+operation+"' save.");

                expect(todo.foo).to.equal(123,
                    "foo should have reverted to '123' after cache-clear and re-query.");

                expect(todo.Description, description,
                    "Description should be '{0}' after '{1}' save succeeded and re-query."
                    .format(description, operation));
            }
        }
    });

    /*********************************************************
    * unmapped property can be set by server class calculated property
    *********************************************************/
    it("unmapped property can be set by a calculated property of the server class", function (done) {

        var employeeCtor = function () {
            //'Fullname' is a server-side calculated property of the Employee class
            // This unmapped property will be empty for new entities
            // but will be set for existing entities during query materialization
            this.FullName = "";
        };
        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor("Employee", employeeCtor);

        newEm(store).executeQuery(nancyQuery)
            .then(success)
            .then(done, done);

        function success(data) {
            var emp = data.results[0];
            var fullname = emp.FullName;
            expect(fullname).to.equal(emp.LastName + ', ' + emp.FirstName,
                "emp.FullName should have been calculated on the server as 'Last, First'");
        }
    });

    describe("when ctor has defined property on its prototype", function(){
        var em;
        beforeEach(function(){

            function EmployeeCtor() {} // empty ctor

            Object.defineProperty(EmployeeCtor.prototype, 'FullName', {
                get: function () {
                    var ln = this.LastName;
                    var fn = this.FirstName;
                    return ln ? fn + ' ' + ln : fn;
                }
            });

            var store = cloneModuleMetadataStore();
            store.registerEntityTypeCtor('Employee', EmployeeCtor);
            em = newEm(store);
        });

        it("can simple query the type", function (done) {
            em.executeQuery(nancyQuery)
                .then(success)
                .then(done, done);

            function success(data) {
                var emp = data.results[0];
                var fullName = emp && emp.FullName;
                expect(fullName).to.equal('Nancy Davolio');
            }
        });

        /*********************************************************
        * Explores test case raised by Brian Noyes' reader
        * http://stackoverflow.com/questions/19723761/entityaspect-property-no-longer-availaible-after-adding-an-expand-clause-in-bree
        *********************************************************/
        it("can expand query the type", function (done) {
            em.executeQuery(nancyQuery.expand('Orders'))
                .then(success)
                .then(done, done);

            function success(data) {
                var emp = data.results[0];
                expect(emp).has.property('Orders')
                    .that.has.length.above(0);
            }
        });
    });

    /*********************************************************
    * query result processing sequence is ctor, init-er, attach
    *********************************************************/
    it("query result processing sequence is ctor, init-fn, attach", function (done) {
        // ARRANGE
        var actual;
        var action = {
            ctor: "constructor",
            initFn: "initializer",
            attach: "attach on query"
        };

        var ctor = function ctor () {
            actual && actual.push(action.ctor);
        };

        var initFn = function (c) {
            actual.push(action.initFn);
        };

        var store = cloneModuleMetadataStore();
        store.registerEntityTypeCtor('Customer', ctor, initFn);
        var em = newEm(store);

        // Listen for entity cache 'Attach' event
        em.entityChanged.subscribe(function (args) {
            if (args.entityAction === breeze.EntityAction.AttachOnQuery) {
                actual.push(action.attach);
            }
        });

        actual = [];

        // ACT
        alfredsQuery
            .using(em).execute()
            .then(success)
            .then(done, done);

        // ASSERT
        function success(){
            expect(actual[0]).to.equal(action.ctor,    'ctor called 1st');
            expect(actual[1]).to.equal(action.initFn,  'initializer 2nd');
            expect(actual[2]).to.equal(action.attach,  'attach 3rd');
        }
    });

    /////////////  Helpers /////////////////////
    function cloneModuleMetadataStore() {
        return cloneStore(moduleMetadataStore);
    }

    function cloneStore(source) {
        var metaExport = source.exportMetadata();
        return new MetadataStore().importMetadata(metaExport);
    }

    function newEm(metadataStore) {
        return new EntityManager({
            serviceName: northwindService,
            metadataStore: metadataStore || moduleMetadataStore
        });
    }
});