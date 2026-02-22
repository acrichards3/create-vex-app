module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2022,
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.eslint.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "react", "react-hooks", "sort-keys", "typescript-sort-keys"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist/**", "node_modules/**", "postcss.config.js", "tailwind.config.js", ".eslintrc.cjs"],
  rules: {
    "@typescript-eslint/prefer-nullish-coalescing": [
      "error",
      { ignoreConditionalTests: true, ignoreMixedLogicalExpressions: true },
    ],
    "@typescript-eslint/no-unnecessary-condition": "error",
    "no-unreachable": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { fixStyle: "separate-type-imports", prefer: "type-imports" },
    ],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
    "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "LogicalExpression[operator='||']:not([parent.type='IfStatement']):not([parent.type='ConditionalExpression']):not([parent.type='WhileStatement']):not([parent.type='DoWhileStatement']):not([parent.type='ForStatement'])",
        message: "Use ?? for defaulting; || is only allowed in boolean test contexts.",
      },
      {
        selector: "BinaryExpression[operator='==='][right.type='Identifier'][right.name='undefined']",
        message: "Avoid explicit === undefined comparisons. Prefer nullish checks or refine types.",
      },
      {
        selector: "BinaryExpression[operator='!=='][right.type='Identifier'][right.name='undefined']",
        message: "Avoid explicit !== undefined comparisons. Prefer nullish checks or refine types.",
      },
      {
        selector: "BinaryExpression[operator='==='][left.type='Identifier'][left.name='undefined']",
        message: "Avoid explicit === undefined comparisons. Prefer nullish checks or refine types.",
      },
      {
        selector: "BinaryExpression[operator='!=='][left.type='Identifier'][left.name='undefined']",
        message: "Avoid explicit !== undefined comparisons. Prefer nullish checks or refine types.",
      },
    ],
    "react/jsx-sort-props": ["error", { ignoreCase: false, noSortAlphabetically: false, reservedFirst: false }],
    "react/react-in-jsx-scope": "off",
    "sort-keys": ["error", "asc", { caseSensitive: false, natural: false }],
    "typescript-sort-keys/interface": "error",
    "typescript-sort-keys/string-enum": "error",
  },
  settings: { react: { version: "detect" } },
};
