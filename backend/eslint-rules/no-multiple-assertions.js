/** @type {import("eslint").Rule.RuleModule} */
const noMultipleAssertions = {
  meta: {
    docs: {
      description: "Disallow more than one expect() call per it() block. Each it() should verify exactly one behavior.",
    },
    messages: {
      multipleAssertions:
        "it() block contains {{count}} expect() calls. Split into separate it() blocks — one assertion per test.",
    },
    schema: [],
    type: "suggestion",
  },

  create(context) {
    const itStack = [];

    const isItCall = (node) =>
      node.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      (node.callee.name === "it" || node.callee.name === "test");

    const isExpectCall = (node) =>
      node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "expect";

    return {
      CallExpression(node) {
        if (isItCall(node)) {
          const cb = node.arguments[1];
          if (cb && (cb.type === "ArrowFunctionExpression" || cb.type === "FunctionExpression")) {
            itStack.push({ count: 0, node });
          }
        }

        if (isExpectCall(node) && itStack.length > 0) {
          itStack[itStack.length - 1].count += 1;
        }
      },

      "CallExpression:exit"(node) {
        if (!isItCall(node)) return;

        const frame = itStack[itStack.length - 1];
        if (frame && frame.node === node) {
          itStack.pop();
          if (frame.count > 1) {
            context.report({
              data: { count: String(frame.count) },
              messageId: "multipleAssertions",
              node,
            });
          }
        }
      },
    };
  },
};

export default noMultipleAssertions;
