import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import perfectionist from "eslint-plugin-perfectionist";
import describeStructure from "./eslint-rules/describe-structure.js";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "**/*.cjs"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        project: ["./tsconfig.json"],
        sourceType: "module",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      perfectionist,
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "separate-type-imports", prefer: "type-imports" },
      ],
      "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignoreConditionalTests: true, ignoreMixedLogicalExpressions: true },
      ],
      "no-restricted-syntax": [
        "error",
        {
          message: "Use ?? for defaulting; || is only allowed in boolean test contexts.",
          selector:
            "LogicalExpression[operator='||']:not([parent.type='IfStatement']):not([parent.type='ConditionalExpression']):not([parent.type='WhileStatement']):not([parent.type='DoWhileStatement']):not([parent.type='ForStatement'])",
        },
        {
          message: "Avoid explicit === undefined comparisons. Prefer nullish checks or refine types.",
          selector: "BinaryExpression[operator='==='][right.type='Identifier'][right.name='undefined']",
        },
        {
          message: "Avoid explicit !== undefined comparisons. Prefer nullish checks or refine types.",
          selector: "BinaryExpression[operator='!=='][right.type='Identifier'][right.name='undefined']",
        },
        {
          message: "Avoid explicit === undefined comparisons. Prefer nullish checks or refine types.",
          selector: "BinaryExpression[operator='==='][left.type='Identifier'][left.name='undefined']",
        },
        {
          message: "Avoid explicit !== undefined comparisons. Prefer nullish checks or refine types.",
          selector: "BinaryExpression[operator='!=='][left.type='Identifier'][left.name='undefined']",
        },
        {
          message: "No .then(). Use async/await instead.",
          selector: "CallExpression[callee.property.name='then']",
        },
        {
          message: "No .catch(). Use try/catch with async/await instead.",
          selector: "CallExpression[callee.property.name='catch']",
        },
      ],
      "no-unreachable": "error",
      "perfectionist/sort-interfaces": ["error", { order: "asc", type: "natural" }],
      "perfectionist/sort-objects": ["error", { order: "asc", type: "natural" }],
    },
  },
  {
    files: ["**/*.spec.ts"],
    plugins: {
      local: { rules: { "describe-structure": describeStructure } },
    },
    rules: {
      "local/describe-structure": "error",
    },
  },
];
