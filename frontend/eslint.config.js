import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactHooksExtra from "eslint-plugin-react-hooks-extra";
import perfectionist from "eslint-plugin-perfectionist";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";

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
      sonarjs,
      unicorn,
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      ...react.configs["recommended"].rules,
      ...reactHooks.configs["recommended"].rules,
      ...sonarjs.configs["recommended"].rules,
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "separate-type-imports", prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignoreConditionalTests: true, ignoreMixedLogicalExpressions: true },
      ],
      "@typescript-eslint/require-await": "error",
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
        {
          message:
            "Use apiFetch from ~/api/client.util instead of raw fetch(). It handles CSRF tokens and credentials.",
          selector: "CallExpression[callee.name='fetch']",
        },
        {
          message: "expect() is only allowed in spec files (*.spec.ts). Move assertions to a test file.",
          selector: "CallExpression[callee.name='expect']",
        },
      ],
      "no-unreachable": "error",
      "perfectionist/sort-interfaces": ["error", { order: "asc", type: "natural" }],
      "perfectionist/sort-jsx-props": ["error", { order: "asc", type: "natural" }],
      "perfectionist/sort-objects": ["error", { order: "asc", type: "natural" }],
      "react-hooks-extra/no-direct-set-state-in-use-effect": "error",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "sonarjs/no-dead-store": "error",
      "sonarjs/no-commented-code": "off",
      "sonarjs/todo-tag": "off",
      "unicorn/no-await-expression-member": "error",
      "unicorn/no-useless-undefined": "error",
      "unicorn/prefer-at": "error",
    },
    settings: { react: { version: "detect" } },
  },
  {
    files: ["src/api/client.util.ts", "src/env/**"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["**/*.tsx"],
    rules: {
      "sonarjs/function-return-type": "off",
    },
  },
];
