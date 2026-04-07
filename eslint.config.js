import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Catalyst Design System: flag banned colors (Golden Hour, yellow/amber badges, HSL)
      "no-restricted-syntax": ["warn",
        {
          selector: "Literal[value=/^#[Cc]69[Cc]6[Dd]/]",
          message: "Banned: Golden Hour color #C69C6D. Use design tokens from src/theme/tokens.ts.",
        },
        {
          selector: "Literal[value=/^#5[Cc]7[Cc]5[Cc]/]",
          message: "Banned: Golden Hour color #5C7C5C. Use design tokens from src/theme/tokens.ts.",
        },
        {
          selector: "Literal[value=/^#8[Bb]7355/]",
          message: "Banned: Golden Hour color #8B7355. Use design tokens from src/theme/tokens.ts.",
        },
        {
          selector: "Literal[value=/^#[Dd]4[Bb]896/]",
          message: "Banned: Golden Hour color #D4B896. Use design tokens from src/theme/tokens.ts.",
        },
        {
          selector: "Literal[value=/^hsl\\(/]",
          message: "Avoid raw HSL values. Use hex literals or CSS variables. See CLAUDE.md L38.",
        },
      ],
    },
  },
);
