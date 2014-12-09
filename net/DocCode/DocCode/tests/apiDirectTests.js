// ReSharper disable UnusedParameter
/***********************************************************
* Api Direct Test Module
*
* Call the Todos persistence service with jQuery
* instead of Breeze EntityManager
***********************************************************/
// ReSharper disable InconsistentNaming

(function (testFns) {
    "use strict";

    module("api direct tests",
        { teardown: testFns.teardown_todosReset });

    /*********************************************************
    * purge the Todos Db
    *********************************************************/

    test("purge the Todos Db", function () {
        expect(1);
        stop(); // going async
        testFns.todosPurge() // returns a jQuery promise (grrr)
            .then(function (msg) {
                ok(-1 < msg.indexOf("purge"), msg);
            })
            .fail(testFns.handleFail).always(start);
    });


    /*********************************************************
    * reset the Todos Db
    *********************************************************/

    test("reset the Todos Db", function () {
        expect(1);
        stop();
        testFns.todosReset() // returns a jQuery promise (grrr)
            .then(function (msg) {
                ok(-1 < msg.indexOf("reset"), msg);
            })
            .fail(testFns.handleFail).always(start);
    });

})(docCode.testFns);