/* jshint -W117, -W030, -W109 */
describe("query_ordering_paging:", function () {
    'use strict';

    ash.serverIsRunningPrecondition();

    var em;
    var EntityQuery = breeze.EntityQuery;
    var gotResults = ash.gotResults;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    beforeEach(function () {
        em = newEm(); // fresh EntityManager before each test
    });

    describe("when orderBy", function () {

        it("property (ascending)", function (done) {
            EntityQuery.from('Employees')
                .orderBy('LastName')
                .using(em).execute()
                .then(function(data){assertEmployeesSorted(data, false);}).then(done, done);

        });

        it("property (descending)", function (done) {
            EntityQuery.from('Employees')
                // the optional second word indicates direction (ascending is default)
                // that second word must begin with 'desc' or 'asc', ignores case
                .orderBy('LastName Descending')
                .using(em).execute()
                .then(function(data){assertEmployeesSorted(data, true);}).then(done, done);

        });

        it("two properties (both ascending)", function (done) {
            EntityQuery.from('Employees')
                // separate property names by a comma (,)
                .orderBy('LastName, FirstName')
                .using(em).execute()
                .then(function(data){assertEmployeesSorted(data, false, false);}).then(done, done);

        });

        it("two properties (ascending and descending)", function (done) {
            EntityQuery.from('Employees')
                // the optional second word indicates direction (ascending is default)
                // that second word must begin with 'desc' or 'asc', ignores case
                .orderBy('LastName, FirstName desc')
                .using(em).execute()
                .then(function(data){assertEmployeesSorted(data, false, true);}).then(done, done);

        });

        it("related entity property (ascending) and own property (descending)", function (done) {
            // Products sorted by Supplier name and UnitPrice (descending) within Supplier
            // Aside: needed to restrict to USA Supplier because can't sort
            EntityQuery.from('Products')
                //.where('Supplier.Location.Country', '==', 'USA')
                .expand('Supplier')
                // the optional second word indicates direction (ascending is default)
                // that second word must begin with 'desc' or 'asc', ignores case
                .orderBy('Supplier.CompanyName, UnitPrice desc, ProductID')
                .using(em).execute()
                .then(assertProductsSorted).then(done, done);

            function assertProductsSorted(data){

                gotResults(data);
                var products = data.results;
                var len = products.length;

                // get the unsorted products that the query put in cache
                var cachedProducts = em.getEntities('Product');

                expect(len).to.equal(cachedProducts.length,'queried products[] and cached products[]');

                // sort cached locally
                cachedProducts.sort(productComparer);

                // log the sorted products
                // cachedProducts.forEach(function(p, i){ console.log(describe(p, i)); });

                // compare result with sorted cached products
                products.forEach(function(product, i){
                    expect(product.ProductID).to.equal(cachedProducts[i].ProductID,
                        'sort mismatch detected [result = {0}] !== [cached: {1}]'
                            .format(describe(product, i), describe(cachedProducts[i],i)));
                });

                function describe(p, i){
                    return '#{0} {1}: ({2}) {3} ${4}'
                        .format(i,  p.Supplier.CompanyName ,p.ProductID, p.ProductName, p.UnitPrice);
                }

                function productComparer(left, right){
                    if (left.Supplier === right.Supplier){
                        // same supplier
                        if (left.UnitPrice === right.UnitPrice){
                            // same price, ProductID
                            return left.ProductID < right.ProductID ? -1 : 1;
                        } else {
                            return left.UnitPrice < right.UnitPrice ? 1 : -1; // descending unit price
                        }
                    } else {
                        return ash.replaceAccentChars(left.Supplier.CompanyName.toLowerCase()) <
                               ash.replaceAccentChars(right.Supplier.CompanyName.toLowerCase()) ? -1 : 1;
                    }
                }
            }

        });
    });

    describe("when paging (top, take, skip)", function () {
        var productIds;
        // use this product query as the basis for subsequent queries in this section
        var rootQuery =  EntityQuery.from("Products").orderBy('ProductName');

        before(function(done){
                var em2 = newEm();
                rootQuery.select('ProductID').using(em2).execute()
                .then(function(data){
                    productIds = data.results.map(function(p){return p.ProductID;});
                })
                .then(done, done);
        });

        it("take first 'x' entities", function (done) {
            rootQuery.take(5)
                .using(em).execute()
                .then(function(data){
                    expectedSkipTakeResults(data, 0, 5);
                })
                .then(done, done);

        });

        it("top 'x' same as take first 'x' entities", function (done) {
            rootQuery.top(10)
                .using(em).execute()
                .then(function(data){
                    expectedSkipTakeResults(data, 0, 10);
                })
                .then(done, done);

        });

        it("skip first 'y' entities", function (done) {
            rootQuery.skip(10)
                .using(em).execute()
                .then(function(data){
                    expectedSkipTakeResults(data, 10);
                })
                .then(done, done);

        });

        it("skip 'y', then take next 'x' entities", function (done) {
            rootQuery.skip(10).take(5)
                .using(em).execute()
                .then(function(data){
                    expectedSkipTakeResults(data, 10, 5);
                })
                .then(done, done);

        });

        it("inlineCount with skip 'y', take 'x' entities", function (done) {
            // inlineCount reports query result count in the absence of paging
            rootQuery.skip(10).take(5).inlineCount()
                .using(em).execute()
                .then(function(data){
                    expect(data.inlineCount).to.equal(productIds.length);
                })
                .then(done, done);

        });

        it("inlineCount with paged 'where' clause", function (done) {
            // inlineCount reports query result count in the absence of paging
            var expectedCount;

            // prepare the filtered query
            var filtered = rootQuery.where('ProductName', 'startsWith', 'g');

            // query first to count the number of filtered products
            filtered.using(em).execute()
            .then(function(data){ expectedCount = data.results.length; })
            // then re-query with paging and inlineCount
            .then(pagedQuery)
            .then(assertCountsAreEqual)
            .then(done, done);


            function pagedQuery() {
                return filtered.skip(10).take(5).inlineCount()
                    .using(em).execute();
            }

            function assertCountsAreEqual(data) {
                expect(data.inlineCount).to.equal(expectedCount);
            }

        });

        function expectedSkipTakeResults(data, skip, take){
            expect(data.results.map(function(p){return p.ProductID;}))
                .to.eql(productIds.slice(skip, take ? skip + take : undefined));
        }
    });

    /////////////// Helpers //////////////////////

    // Assert that employees in the query data (data.results) are sorted as expected
    // by comparing with all cached employees, after sorting them in-memory
    // lnDesc: false if LastName sorted ascending, true if descending, null if should ignore LastName.
    // fnDesc: false if FirstName sorted ascending, true if descending, null if should ignore FirstName.
    function assertEmployeesSorted(data, lnDesc, fnDesc) {

        gotResults(data);
        var employees = data.results;
        var len = employees.length;

        // get the unsorted employees that the query put in cache
        var cachedEmployees = em.getEntities('Employee');

        expect(len).to.equal(cachedEmployees.length,'queried employees[] and cached employees[]');

        // sort cached locally
        cachedEmployees = sortLnFn(cachedEmployees, lnDesc, fnDesc);

        // compare result with sorted cached employees
        employees.forEach(function(employee, i){
            expect(employee.EmployeeID).to.equal(cachedEmployees[i].EmployeeID,
                'sort mismatch detected at index: {0}, [result: {1}, {2}],  [cached: {3}, {4}]'
                .format(i, employee.LastName, employee.FirstName,
                           cachedEmployees[i].LastName, cachedEmployees[i].FirstName));
        });
    }

    // Sort employees by LastName, FirstName
    // either name ascending or descending
    // possibly ignoring either name
    function sortLnFn(emps, lnDesc, fnDesc) {

        // ignore LastName if its 'descending' flag isn't boolean
        var ignoreLn = lnDesc == null;

        // ignore FirstName if its 'descending' flag isn't boolean
        var ignoreFn = fnDesc == null;

        var map = emps.map(function (emp, i) {
            return {index: i, fn: emp.FirstName.toLowerCase(), ln: emp.LastName.toLowerCase()};
        });

        map.sort(function (left, right) {
            var lessThan;
            if (!ignoreLn && left.ln !== right.ln) {
                // different last name
                lessThan = lnDesc ? 1 : -1;
                return (left.ln < right.ln) ? lessThan : -lessThan;
            } else if ( ignoreFn || left.fn === right.fn) {
                return 0; // same name
            } else {
                // different first name
                lessThan = fnDesc ? 1 : -1;
                return (left.fn < right.fn) ? lessThan : -lessThan;
            }
        });

        return map.map(function (item) {
            return emps[item.index];
        });
    }
});
