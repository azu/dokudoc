"use strict";
var assert = require("power-assert");
describe('Array', function () {
    describe('#indexOf()', function () {
        it('should return -1 when the value is not present', function () {
            assert.equal([1, 2, 3].indexOf(5), -1);
            assert.equal([1, 2, 3].indexOf(0), -1);
        })
    })
});
