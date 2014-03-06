/**
 * Created by azu on 2014/03/06.
 * LICENSE : MIT
 */
"use strict";
var esprima = require('esprima');
var estraverse = require('estraverse');
var astScope = require("ast-scope");
var esquery = require("esquery");
var clone = require("clone");
// inspired form https://github.com/eslint/eslint/blob/master/lib/rules/block-scoped-var.js
var resultStack = [
    []
    /*
        {
            "name" : "",
            "value" :""
        }
     */
];
var stack = [
    []
];

//--------------------------------------------------------------------------
// Helpers
//--------------------------------------------------------------------------
function pushBlock(node, parent) {
    stack.push([]);
}

function recordValue(value) {
    resultStack[resultStack.length - 1].push(value);
}
function popBlock() {
    var value = stack.pop();
    recordValue(value);
}

var helper = {
    contextIdentifierNames: ["describe", "context", "it"],
    isContext: function (node) {
        if (node.type === estraverse.Syntax.ExpressionStatement &&
            node.expression.type === estraverse.Syntax.CallExpression &&
            this.contextIdentifierNames.indexOf(node.expression.callee.name) !== -1) {
            return true;
        }
    },
    getContextName: function (node) {
        return node.expression.callee.name;
    },
    pushContext: function (node, currentScope) {
        var firstArgument = node.expression["arguments"][0];
        var literal = clone(firstArgument, false);// shallow copy
        literal["name"] = this.getContextName(node);
        currentScope.push(literal);
        return currentScope;
    },
    isAssertion: function (node) {
        /*
                    "expression": {
                        "type": "CallExpression",
                        "callee": {
                            "type": "MemberExpression",
                            "computed": false,
                            "object": {
                                "type": "Identifier",
                                "name": "assert"
                            },
                            "property": {
                                "type": "Identifier",
                                "name": "equal"
                            }
                        },
         */
        var expression = node.expression;
        if (expression.type === estraverse.Syntax.CallExpression &&
            typeof expression.callee.object !== "undefined" &&
            expression.callee.object.type === estraverse.Syntax.Identifier &&
            expression.callee.object.name === "assert") {
            return true;
        }
        /*
                    "type": "ExpressionStatement",
                    "expression": {
                        "type": "CallExpression",
                        "callee": {
                            "type": "Identifier",
                            "name": "assert"
                        },
                        "arguments": [
                            {
                                "type": "Literal",
                                "value": 1,
                                "raw": "1"
                            }
                        ]
                    }
         */
        if (expression.type === estraverse.Syntax.CallExpression &&
            expression.callee.type === estraverse.Syntax.Identifier &&
            expression.callee.name === "assert") {
            return true;
        }
    },
    getAssertionName: function (node) {
        return node.expression.callee.property.name;
    },
    pushAssertion: function (node, currentScope) {
        var args = node.expression["arguments"];
        var actual = args[0] ? clone(args[0], false) : null,
            expected = args[1] ? clone(args[1], false) : null;
        var result = {};
        result["actual"] = actual;
        result["expected"] = expected;
        result["name"] = this.getAssertionName(node);
        currentScope.push(result);
        return currentScope;
    }
};
function dokudoc(code, options) {
    var ast = esprima.parse(code);
    estraverse.traverse(ast, {
        enter: function enter(node, parent) {
            var fn = {
                "Program": pushBlock,
                "BlockStatement": pushBlock,
                "ExpressionStatement": function (node) {
                    var currentScope = stack.pop();
                    if (helper.isContext(node)) {
                        helper.pushContext(node, currentScope);
                    }
                    if (helper.isAssertion(node)) {
                        helper.pushAssertion(node, currentScope);
                    }
                    stack.push(currentScope);
                }
            }[node.type];
            if (fn) {
                fn(node, parent);
            }
        },
        leave: function (node, parent) {
            var fn = {
                "Program": popBlock,
                "BlockStatement": popBlock
            }[node.type];
            if (fn) {
                fn(node, parent);
            }
        }
    });

    resultStack.forEach(function (e) {
        console.log(e);
    });
    return [];
}
module.exports = dokudoc;