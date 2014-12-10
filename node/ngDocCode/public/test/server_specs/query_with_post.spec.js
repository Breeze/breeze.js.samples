/* jshint -W117, -W030, -W109 */
describe("query_with_post:", function () {
    'use strict';

    var em;
    var EntityQuery = breeze.EntityQuery;
    var newEm = ash.newEmFactory(ash.northwindServiceName);

    ash.serverIsRunningPrecondition();

    beforeEach(ash.asyncModule('breeze.angular'));

    beforeEach(inject(function (breeze) {
        // injecting breeze ensures fresh breeze 
        // angular ajax Adapter before every test
        breeze.ajaxpost(); // add POST option to ajax adapter
        em = newEm();      // fresh EntityManager before each test
    }));

    ///////////////////////////

    describe("POST query for customers", function () {

        var resource = 'CustomersWithFilterOptions';

        it("to get all customers", function (done) {
            EntityQuery.from(resource)
                .withParameters({
                    $method: 'POST',
                    $encoding: 'JSON',
                    $data: {}
                })
                .using(em).execute()
                .then(success)
                .then(done, done);

            function success(data){
                expect(data.results).to.have.length.above(10);
            }
        });

        it("by CompanyName", function (done) {

            var companyName = 'Die Wandernde Kuh';

            EntityQuery.from(resource)
                .withParameters({
                    $method: 'POST',
                    $encoding: 'JSON',
                    $data: {
                        CompanyName: companyName
                    }
                })
                .using(em).execute()
                .then(success)
                .then(done, done);

            function success(data){
                expect(data.results).to.have.length(1);
                var cust = data.results[0];
                expect(cust.CompanyName).to.equal(companyName);
            }
        });

        it("by CompanyIds", function (done) {

            var ids = [
            "729de505-ea6d-4cdf-89f6-0360ad37bde7",
            "cd98057f-b5c2-49f4-a235-05d155e636df"];

            EntityQuery.from(resource)
                .withParameters({
                    $method: 'POST',
                    $encoding: 'JSON',
                    $data: {
                        Ids: ids
                    }
                })
                .using(em).execute()
                .then(success)
                .then(done, done);

            function success(data){
                expect(data.results).to.have.length(ids.length);
                data.results.forEach(function (c, i){
                   expect(ids.indexOf(c.CustomerID))
                    .to.above(-1, c.CompanyName + '(' +
                        c.CustomerId + ') not found'); 
               }); 
            }
        });

        it("by CompanyName and CompanyIds", function (done) {

            var companyName = 'Die Wandernde Kuh';
            var ids = [
            "729de505-ea6d-4cdf-89f6-0360ad37bde7",
            "cd98057f-b5c2-49f4-a235-05d155e636df"];

            EntityQuery.from(resource)
                .withParameters({
                    $method: 'POST',
                    $encoding: 'JSON',
                    $data: {
                        CompanyName: companyName,
                        Ids: ids
                    }
                })
                .using(em).execute()
                .then(success)
                .then(done, done);

            function success(data){
                expect(data.results).to.have.length(1);
                data.results.forEach(function (c, i){
                    expect(c.CompanyName).to.equal(companyName);
                    expect(ids.indexOf(c.CustomerID))
                        .to.above(-1, c.CompanyName + '(' +
                            c.CustomerId + ') not found'); 
               }); 
            }
        });

        it("w/ invalid CompanyName returns none", function (done) {

            var companyName = 'Not a real company';

            EntityQuery.from(resource)
                .withParameters({
                    $method: 'POST',
                    $encoding: 'JSON',
                    $data: {
                        CompanyName: companyName
                    }
                })
                .using(em).execute()
                .then(success)
                .then(done, done);

            function success(data){
                expect(data.results).to.have.length(0);
            }
        }); 


        it("by CompanyName w/ appended URL query string", function (done) {
            // See SO question
            // http://stackoverflow.com/questions/27364078/breezejs-datacontext-post-in-angular-turns-into-get
            var companyName = 'Die Wandernde Kuh';

            // Notice the query string appended to the resource
            EntityQuery.from(resource + '?token=1234ABCD')
                .withParameters({
                    $method: 'POST',
                    $encoding: 'JSON',
                    $data: {
                        CompanyName: companyName
                    }
                })
                .using(em).execute()
                .then(success)
                .then(done, done);

            function success(data){
                expect(data.results).to.have.length(1);
                var cust = data.results[0];
                expect(cust.CompanyName).to.equal(companyName);
            }
        });        
    });

});
