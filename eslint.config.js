import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "dist-marks/**", "dist-store/**", "dist-e2e/**", ".store-pack/**", "measure-output/**", "node_modules/**", "playwright-report/**", "test-results/**", "server/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, chrome: "readonly" },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-eval": "error",
      "no-implied-eval": "error",
    },
  },
);
