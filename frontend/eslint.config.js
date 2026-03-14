import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactHooksExtra from "eslint-plugin-react-hooks-extra";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "postcss.config.js",
      "tailwind.config.js",
      "src/routeTree.gen.ts",
      "**/*.cjs",
      "vite.config.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { window: "readonly", document: "readonly", navigator: "readonly" },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        project: ["./tsconfig.json"],
        sourceType: "module",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      perfectionist,
      react,
      "react-hooks": reactHooks,
      "react-hooks-extra": reactHooksExtra,
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      ...react.configs["recommended"].rules,
      ...reactHooks.configs["recommended"].rules,
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
      "perfectionist/sort-jsx-props": ["error", { order: "asc", type: "natural" }],
      "perfectionist/sort-objects": ["error", { order: "asc", type: "natural" }],
      "react-hooks-extra/no-direct-set-state-in-use-effect": "error",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
    settings: { react: { version: "detect" } },
  },
];
