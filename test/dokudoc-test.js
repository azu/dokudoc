"use strict";
var fs = require("fs");
var assert = require("power-assert");
var dokudoc = require("../lib/dokudoc");
describe("dokudoc", function () {
    var code = fs.readFileSync(__dirname + "/fixtures/fixture-test.js", "utf-8");
    it("should return array", function () {
        assert(Array.isArray(dokudoc(code)));
    });
    context("with first object",function () {
        it("should be object", function () {
            var results = dokudoc(code);
            assert.equal(typeof results[0], "object");
        });
        it("should return array", function () {
            var results = dokudoc(code);
            var testObject = results[0];
            assert.deepEqual(testObject, {
                "Array": {
                    "#indexOf": {
                        "should return -1 when the value is not present": [
                            {
                                "actual": "[1, 2, 3].indexOf(5)",
                                "expected": "-1"
                            },
                            {
                                "actual": "[1, 2, 3].indexOf(0)",
                                "expected": "-1"
                            }
                        ]
                    }
                }
            });
        });

    });
});