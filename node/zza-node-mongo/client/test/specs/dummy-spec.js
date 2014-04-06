// Prove that testing works at all
xdescribe('dummy', function () {
    'use strict';

    it('expect false to be false', function(){
        expect(false).toBe(false);
    })
    it('should pass an "always true" spec', function () {
        expect(true).toBe(true);
    });

});
