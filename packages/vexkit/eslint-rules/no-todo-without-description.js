/** @type {import("eslint").Rule.RuleModule} */
const noTodoWithoutDescription = {
  meta: {
    docs: {
      description:
        "Disallow it.todo() calls with no argument or an empty string description. Every todo must document what it will test.",
    },
    messages: {
      emptyDescription:
        "it.todo() requires a non-empty description. Write what the test will assert so the spec is meaningful.",
    },
    schema: [],
    type: "suggestion",
  },

  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.object.type !== "Identifier" ||
          node.callee.object.name !== "it" ||
          node.callee.property.type !== "Identifier" ||
          node.callee.property.name !== "todo"
        ) {
          return;
        }

        const arg = node.arguments[0];
        const isEmpty =
          !arg || (arg.type === "Literal" && typeof arg.value === "string" && arg.value.trim().length === 0);

        if (isEmpty) {
          context.report({ messageId: "emptyDescription", node });
        }
      },
    };
  },
};

export default noTodoWithoutDescription;
