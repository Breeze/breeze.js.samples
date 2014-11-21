/* jshint -W117, -W030, -W109 */
// ReSharper disable InconsistentNaming
describe('entityExtensionAsync:', function() {
    'use strict';

    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityState = breeze.EntityState;
    var MetadataStore = breeze.MetadataStore;
    var moduleMetadataStore = new MetadataStore();
    var nancyQuery = EntityQuery.from('Employees')
                                .where('EmployeeID', 'eq', ash.nancyID);
    var northwindService = ash.northwindServiceName;
    var todoService = ash.todosServiceName;

    beforeEach(function (done) {
        if (!moduleMetadataStore.isEmpty()) {
            done(); // got it already
            return; 
        }
        breeze.Q.all(
            moduleMetadataStore.fetchMetadata(northwindService),
            moduleMetadataStore.fetchMetadata(todoService))
        .then(function() { done(); }, done);
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
        })

        it("the ctor does not change the EntityState", function () {
            var aspect = emp.entityAspect;
            expect(aspect.entityState.isUnchanged()).to.equal(true,
                "queried entity whose ctor sets properties should remain Unchanged");
            expect(aspect.originalValues).to.be.empty;               
        });

        it("queried values overwrite the ctor default property value", function () {
            expect(emp.FirstName).to.not.equal('Jolly',
                "queried value should overwrite ctor default FirstName; is " + emp.FirstName);           
        });

        it("unmapped property values are retained", function () {
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
        })

        it("the initializer does not change the EntityState", function () {
            var aspect = emp.entityAspect;
            expect(aspect.entityState.isUnchanged()).to.equal(true,
                "queried entity whose initializer sets properties should remain Unchanged");
            expect(aspect.originalValues).to.be.empty;               
        });

        it("initialized property values should overwrite queried values", function () {
            expect(emp.FirstName).to.equal('Jolly',
                "init'er should overwrite queried FirstName; is " + emp.FirstName);           
        });

        it("untracked property values are retained", function () {
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
        
            if (todo == null) {
                if (operation === "delete") {
                    // OK because todo should be gone from the database after 'delete' save succeeds
                } else {
                    expect(1).to.equal(0, 
                      "todo should still be in the database after '"+operation+"' save.");
                }
                return;
            }

            expect(todo.foo).to.equal(123, 
                "foo should have reverted to '123' after cache-clear and re-query.");

            expect(todo.Description, description,
                "Description should be '{0}' after '{1}' save succeeded and re-query."
                .format(description, operation));
        }
    });

    /*********************************************************
    * unmapped property can be set by server class calculated property
    *********************************************************/
    it("unmapped property can be set by a calculated property of the server class"); /*, function (done) {
        var store1 = cloneModuleMetadataStore();

        var store2 = cloneModuleMetadataStore();
        var employeeCtor = function () {
            //'Fullname' is a server-side calculated property of the Employee class
            // This unmapped property will be empty for new entities
            // but will be set for existing entities during query materialization
            this.FullName = "";
        };
        store2.registerEntityTypeCtor("Employee", employeeCtor);


        var em1 = newEm(store1); // no unmapped properties registered
        var prop = em1.metadataStore.getEntityType('Employee').getProperty('FullName');
        ok(!prop,
            "'FullName' should NOT be a registered property of 'em1'.");

        var em2 = newEm(store2);
        prop = em2.metadataStore.getEntityType('Employee').getProperty('FullName');
        ok(prop && prop.isUnmapped,
            "'FullName' should be an unmapped property in 'em2'");

        var query = EntityQuery.from('Employees');
        var p1 = em1.executeQuery(query).then(success1);
        var p2 = em2.executeQuery(query).then(success2);

        Q.all([p1, p2]).fail(handleFail).fin(start);

        function success1(data) {
            var first = data.results[0];
            var fullname = first.FullName;
            ok(!fullname, 
                "an Employee queried with 'em1' should NOT have a 'FullName' property, let alone a value for it");
        }

        function success2(data) {
            var first = data.results[0];
            var fullname = first.FullName();
            ok(fullname, 
                "an Employee queried with 'em2' should have a calculated FullName ('Last, First'); it is '{0}'"
                .format(fullname));
        }

    });
*/
    /*********************************************************
    * queried entity has new property from post-construction initializer
    *********************************************************/
    it("queried entity has new property from post-construction initializer"); /*,
        function () {
            var store = cloneModuleMetadataStore();

            var Customer = function () { };

            var customerInitializer = function (customer) {
                customer.foo = "Foo " + customer.CompanyName();
            };

            store.registerEntityTypeCtor("Customer", Customer, customerInitializer);

            // create EntityManager with extended metadataStore
            var em = newEm(store);
            var query = EntityQuery.from("Customers").top(1);

            em.executeQuery(query)
                .then(function (data) {
                    var cust = data.results[0];
                    equal(cust.foo, "Foo "+cust.CompanyName(),
                        "'foo' property, created in initializer, performed as expected");
                })
                .fail(handleFail)
                .fin(start);
    });
*/

    /*********************************************************
    * unmapped property can be set by server class calculated property
    *********************************************************/

    it("unmapped property can be set by a calculated property of the server class"); /*, function () {
        var store1 = cloneModuleMetadataStore();

        var store2 = cloneModuleMetadataStore();
        var employeeCtor = function () {
            //'Fullname' is a server-side calculated property of the Employee class
            // This unmapped property will be empty for new entities
            // but will be set for existing entities during query materialization
            this.FullName = "";
        };
        store2.registerEntityTypeCtor("Employee", employeeCtor);


        var em1 = newEm(store1); // no unmapped properties registered
        var prop = em1.metadataStore.getEntityType('Employee').getProperty('FullName');
        ok(!prop,
            "'FullName' should NOT be a registered property of 'em1'.");

        var em2 = newEm(store2);
        prop = em2.metadataStore.getEntityType('Employee').getProperty('FullName');
        ok(prop && prop.isUnmapped,
            "'FullName' should be an unmapped property in 'em2'");

        var query = EntityQuery.from('Employees');
        var p1 = em1.executeQuery(query).then(success1);
        var p2 = em2.executeQuery(query).then(success2);

        Q.all([p1, p2]).fail(handleFail).fin(start);

        function success1(data) {
            var first = data.results[0];
            var fullname = first.FullName;
            ok(fullname === undefined, 
                "an Employee queried with 'em1' should NOT have a 'FullName' property, let alone a value for it");
        }

        function success2(data) {
            var first = data.results[0];
            var fullname = first.FullName;
            ok(fullname, "an Employee queried with 'em2' should have a calculated FullName ('Last, First'); it is '{0}'"
                .format(fullname));
        }

    });
    */

    /*********************************************************
    * add fancy constructor to employee and query with it
    *********************************************************/

    it("add fancy constructor to employee and query with it"); /*, function (done) {
        var store = cloneModuleMetadataStore();
        var em = newEm(store);
        addFancyEmpCtor(store);

        breeze.EntityQuery.from('Employees')
            .where('FirstName', 'eq', 'Nancy')
            .using(em).execute()
            .then(success).catch(handleFail).finally(start);

        function success(data) {
            var emp = data.results[0];
            ok(emp != null, "Should have an employee");
            var full = emp && emp.FullName;
            equal('Nancy Davolio', full, "emp fullname is "+full);
        }

    });
    */
    /*********************************************************
    * add fancy constructor to employee and expand query with it
    * Explores test case raised by Brian Noyes' reader in this S.O.
    * http://stackoverflow.com/questions/19723761/entityaspect-property-no-longer-availaible-after-adding-an-expand-clause-in-bree
    *********************************************************/

    it("add fancy constructor to employee and expand query with it"); /*, function (done) {
        var store = cloneModuleMetadataStore();
        var em = newEm(store);
        addFancyEmpCtor(store);

        breeze.EntityQuery.from('Employees')
            .where('FirstName', 'eq', 'Nancy')
            .expand('Orders')
            .using(em).execute()
            .then(success).catch(handleFail).finally(start);

        function success(data) {
            var emp = data.results[0];
            ok(emp != null, "Should have an employee");
            var ordersLen = emp ? emp.Orders.length : 0;
            ok(ordersLen > 0, "emp has "+ordersLen+" orders.");
        }

    });
    function addFancyEmpCtor(store) {
        function EmployeeCtor() {
            this.isChanged = false; // unmapped r/w property
        }

        Object.defineProperty(EmployeeCtor.prototype, 'FullName', {
            get: function () {
                var ln = this.LastName;
                var fn = this.FirstName;

                return ln ? fn + ' ' + ln : fn;
            }
        });

        store.registerEntityTypeCtor('Employee', EmployeeCtor);
    }

    */
    /*********************************************************
    * query sequence is ctor, init-er, merge
    *********************************************************/

    it("query entity sequence is ctor, init-er, merge");    /*,
        function () {
            // ARRANGE
            var expected = {
                ctor: "constructor",
                initer: "initializer",
                attach: "merge"
            };
            var actual = [];
            var store = cloneModuleMetadataStore();
            store.registerEntityTypeCtor(
                'Customer',
                function () { // ctor
                    actual.push(expected.ctor);
                },
                function () {
                    actual.push(expected.initer);
                });
            actual = []; // reset after registration

            var em = newEm(store);
            em.entityChanged.subscribe(function (args) {
                if (args.entityAction === breeze.EntityAction.AttachOnQuery) {
                    actual.push(expected.attach);
                }
            });

            // ACT
            EntityQuery
                .from('Customers').take(1)
                .using(em).execute()
                .then(success).fail(handleFail).fin(start);

            // ASSERT
            function success() {
                var exp = [];
                for (var prop in expected) { exp.push(expected[prop]); }
                deepEqual(actual, exp,
                    "Call sequence should be: " + exp.join(", "));
            }
        });
    */

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