/** @type {import("eslint").Rule.RuleModule} */
const noDuplicateDescribe = {
  meta: {
    docs: {
      description:
        "Disallow multiple top-level describe blocks with the same title in a single file. All branches for a function must be nested inside one describe.",
    },
    messages: {
      duplicate:
        "Duplicate top-level describe('{{title}}'). All WHEN/AND branches for '{{title}}' must be nested inside a single top-level describe block.",
    },
    schema: [],
    type: "suggestion",
  },

  create(context) {
    const topLevelTitles = new Map();
    let describeDepth = 0;

    const getTitle = (node) => {
      const arg = node.arguments[0];
      if (!arg) return null;
      if (arg.type === "Literal" && typeof arg.value === "string") return arg.value;
      if (arg.type === "TemplateLiteral" && arg.quasis.length === 1) {
        return arg.quasis[0].value.cooked ?? null;
      }
      return null;
    };

    const isDescribeCall = (node) =>
      node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "describe";

    return {
      CallExpression(node) {
        if (!isDescribeCall(node)) return;

        if (describeDepth === 0) {
          const title = getTitle(node);
          if (title !== null) {
            if (topLevelTitles.has(title)) {
              context.report({
                data: { title },
                messageId: "duplicate",
                node: node.arguments[0],
              });
            } else {
              topLevelTitles.set(title, node);
            }
          }
        }

        describeDepth += 1;
      },

      "CallExpression:exit"(node) {
        if (!isDescribeCall(node)) return;
        describeDepth -= 1;
      },
    };
  },
};

export default noDuplicateDescribe;
