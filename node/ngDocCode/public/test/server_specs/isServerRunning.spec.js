/* jshint -W117, -W030, -W109 */
describe("isServerRunning:", function () {
    var testFns = window.docCode.testFns;
    var serviceName = testFns.northwindServiceName;

    before(function(done){
        this.timeout(32000);
        var $injector = angular.injector(['ng']);
        $injector.invoke(['$http', '$rootScope', function ($http, $rootScope) {
            var url = serviceName+'/employees?$top=0';
            // fire one in to kick the server... not sure why this is necessary
            $http.get(url);
            // Now we really test this one
            $http.get(url, {timeout: 30000})// just looking for a response
                .then(function(){
                    testFns.isServerRunning = true;
                    console.log('Server '+serviceName+' is running');
                    done();
                })
                .catch(function(res){
                    if (res.status === 0 ){
                        testFns.isServerRunning = false;
                        var msg = 'Server '+serviceName+' is NOT running';
                        done(new Error(msg));
                    } else {
                        // something else is wrong but the server is up and that's all we care about here
                        console.error("Unexpected error while looking for server: "+res.data);
                    }
                });
            $rootScope.$apply();
        }]);
    });

    it(serviceName+" should be running", function(){
        expect(testFns.isServerRunning).to.be.true;
    })
});
