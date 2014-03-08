/**
 * Created by azu on 2014/03/06.
 * LICENSE : MIT
 */
"use strict";
var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var esquery = require("esquery");
var clone = require("clone");
function dokudoc(code, options) {
    var ast = esprima.parse(code, {
        range: true
    });
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
    var scopeChain = [
        []
    ];

    //--------------------------------------------------------------------------
    // Helpers
    //--------------------------------------------------------------------------
    function pushBlock(node, parent) {
        scopeChain.push([]);
    }

    function recordValue(value) {
        resultStack[resultStack.length - 1].push(value);
    }

    function popBlock() {
        var value = scopeChain.pop();
        recordValue(value);
    }

    function createHelper(code, options) {
        return {
            contextIdentifierNames: ["describe", "context", "it"],
            isContext: function (node) {
                return node.type === estraverse.Syntax.ExpressionStatement &&
                    node.expression.type === estraverse.Syntax.CallExpression &&
                    this.contextIdentifierNames.indexOf(node.expression.callee.name) !== -1;

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
                return false;
            },
            getAssertionName: function (node) {
                return node.expression.callee.property.name;
            },
            pushAssertion: function (node, currentScope) {
                var args = node.expression["arguments"];
                var actual = args[0] ? clone(args[0], false) : null,
                    expected = args[1] ? clone(args[1], false) : null;
                var result = {};
                result["actual"] = this.getCodeFromRange(actual.range);
                result["expected"] = this.getCodeFromRange(expected.range);
                result["name"] = this.getAssertionName(node);
                currentScope.push(result);
                return currentScope;
            },
            getCodeFromRange: function (range) {
                if (!range) {
                    return null;
                }
                return code.substring(range[0], range[1]);
            }
        }
    }

    var helper = createHelper(code, options);

    function buildTreeFormStack(stackArray) {
        // stack -> executed order
        var ordered = stackArray.reverse();
        var results = ordered.map(function (stack) {
            // assertion
            if (Array.isArray(stack)) {
                return stack.map(function (assetion) {
                    if (assetion.type === estraverse.Syntax.Literal) {
                        console.log(assetion);
                    } else {
                        console.log(assetion);
                    }
                    return assetion.name;
                });
            } else {
                if (helper.contextIdentifierNames.indexOf(stack.name) !== -1) {
                    return stack.name;
                }
            }
        });
        console.log(results);
    }

    function handleExpressionStatement(node, parent) {
        var currentScope = scopeChain.pop();
        if (helper.isContext(node)) {
            helper.pushContext(node, currentScope);
        }
        if (helper.isAssertion(node)) {
            helper.pushAssertion(node, currentScope);
        }
        scopeChain.push(currentScope);
    }

    estraverse.traverse(ast, {
        enter: function enter(node, parent) {
            var fn = {
                "Program": pushBlock,
                "BlockStatement": pushBlock,
                "ExpressionStatement": handleExpressionStatement
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
        buildTreeFormStack(e);
    });
    return [];
}
module.exports = dokudoc;