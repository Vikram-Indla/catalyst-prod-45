import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * ADS import guardrail.
 *
 * Product code must consume Atlassian Design System primitives through the
 * Catalyst wrapper layer (src/components/ads) — never directly from
 * @atlaskit/*. This isolates Atlaskit's version-bump blast radius. See
 * src/components/ads/README.md for the full rationale.
 *
 * Exemptions (allowed to import @atlaskit/* directly):
 *   - src/components/ads/**    the wrappers themselves
 *   - src/theme/ads/**         the token bridge
 *
 * Severity = "warn" during the migration window. Each WO that migrates a
 * surface tightens the rule to "error" for the file(s) it owns (by moving
 * the file out of the pre-migration exemption list above). By the end of
 * WO-8 every file in src/** other than the ADS layer should be compliant
 * and the top-level severity can flip to "error" globally.
 *
 * When this rule fires, the fix is always the same: add the primitive to
 * the wrapper layer, then import from '@/components/ads' in product code.
 */
/**
 * Per-severity ADS import guardrails.
 *
 * During migration, keep the codebase-wide rule at "warn" so pre-existing
 * direct `@atlaskit/*` imports don't break every build. As each surface is
 * migrated to `@/components/ads`, add its glob to `adsMigratedFiles` so
 * regressions on that specific file become hard errors.
 */
const makeAdsForbidAtlaskit = (severity) => ({
  "no-restricted-imports": [severity, {
    patterns: [
      {
        group: ["@atlaskit/*"],
        message:
          "Import Atlassian Design System primitives through the Catalyst wrapper at '@/components/ads'. " +
          "Direct '@atlaskit/*' imports are only allowed inside src/components/ads and src/theme/ads. " +
          "See src/components/ads/README.md.",
      },
      {
        group: ["@/components/ads/*"],
        message:
          "Import from the ADS barrel: `import { … } from '@/components/ads'`. " +
          "Deep imports couple callers to the wrapper file structure.",
      },
    ],
  }],
});

const adsForbidAtlaskit = makeAdsForbidAtlaskit("warn");
const adsForbidAtlaskitError = makeAdsForbidAtlaskit("error");

/**
 * Files that have completed their ADS migration — `@atlaskit/*` imports
 * here are a regression, not pre-existing debt. Each entry corresponds
 * to a WO-N work order in the Phase 2 Story View Unification Spec.
 */
const adsMigratedFiles = [
  // WO-1 — Breadcrumbs (Story View surface)
  "src/modules/project-work-hub/components/TicketBreadcrumbs.tsx",
];

/**
 * ADS-internal guardrails — applied only inside src/components/ads/**.
 * Hex literals are forbidden in wrappers; use the theme bridge.
 */
const adsInternalRules = {
  "no-restricted-syntax": ["warn",
    {
      selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
      message:
        "ADS wrappers must read colours through cp(adsTokens.*) — no hex literals. " +
        "See src/theme/ads/tokens.ts.",
    },
  ],
};

/**
 * Catalyst design-system colour guardrails.
 * Flags banned Golden Hour palette, yellow/amber badges, and raw HSL.
 */
const catalystBannedColors = {
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
};

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
      ...catalystBannedColors,
    },
  },
  /**
   * Product code — forbid direct @atlaskit/* imports.
   * The exemption patterns below re-enable them for the ADS layer itself.
   *
   * Severity is "warn" here so the 40+ legacy direct-import sites don't
   * break the build. Per-file "error" upgrade lives in the next block.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/components/ads/**",
      "src/theme/ads/**",
    ],
    rules: {
      ...adsForbidAtlaskit,
    },
  },
  /**
   * Post-migration surfaces — `@atlaskit/*` and deep `@/components/ads/*`
   * imports are hard errors here. Add an entry to `adsMigratedFiles` when
   * a surface completes its WO-N migration.
   */
  {
    files: adsMigratedFiles,
    rules: {
      ...adsForbidAtlaskitError,
    },
  },
  /**
   * ADS layer — internal-only rules (hex-literal ban).
   * @atlaskit/* imports are explicitly allowed here (no no-restricted-imports
   * applied).
   *
   * Story fixtures (*.stories.tsx) are intentionally excluded from the
   * hex-literal ban — stories render demo-only markup (placeholder colour
   * for empty-state text, story-local swatches) and should never leak
   * their styling into the production wrappers. The wrappers themselves
   * remain under the ban.
   */
  {
    files: ["src/components/ads/**/*.{ts,tsx}"],
    ignores: ["src/components/ads/**/*.stories.{ts,tsx}"],
    rules: {
      ...adsInternalRules,
    },
  },
);
