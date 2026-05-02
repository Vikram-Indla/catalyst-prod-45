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
    paths: [
      // Canonical issue-type icon guardrail — non-negotiable, always "error".
      // The dashboard suffered months of icon drift because product code
      // imported the bespoke WorkItemIcon shim instead of the canonical
      // Jira registry. WorkItemIcon now delegates internally so existing
      // call sites still render correctly, but new code MUST import the
      // canonical component directly. The shim file itself is exempted
      // via the `ignores` glob in the consuming config block.
      {
        name: "@/components/shared/WorkItemIcon",
        message:
          "Use `JiraIssueTypeIcon` from '@/lib/jira-issue-type-icons' instead. " +
          "WorkItemIcon is a deprecated shim — new code must import the canonical " +
          "Jira icon component directly so no further glyph drift accumulates.",
      },
    ],
    patterns: [
      {
        // Forbid every @atlaskit/* component/primitive package. The token
        // runtime resolver (@atlaskit/tokens) is intentionally exempted: it
        // is a utility, not a component, and the Catalyst ADS wrapper
        // layer is about *component* isolation — every migrated surface is
        // expected to read colours / spacing through token(...).
        group: ["@atlaskit/*", "!@atlaskit/tokens"],
        message:
          "Import Atlassian Design System primitives through the Catalyst wrapper at '@/components/ads'. " +
          "Direct '@atlaskit/*' imports are only allowed inside src/components/ads and src/theme/ads. " +
          "The @atlaskit/tokens runtime resolver is exempted (utility, not a component). " +
          "See src/components/ads/README.md.",
      },
      {
        group: ["@/components/ads/*"],
        message:
          "Import from the ADS barrel: `import { … } from '@/components/ads'`. " +
          "Deep imports couple callers to the wrapper file structure.",
      },
      // CLAUDE.md §20.2 — Apr 20 2026 direction lock: Atlaskit-only.
      // shadcn/ui primitives are banned in new code. Existing 4,740
      // import sites are on the Rung 3 retirement ladder (§20.3).
      {
        group: ["@/components/ui/*"],
        message:
          "shadcn/ui is BANNED in new code (CLAUDE.md §20.2). Use the " +
          "Catalyst ADS wrapper layer at '@/components/ads' (which delegates " +
          "to @atlaskit/*). If the ADS wrapper for this primitive does not " +
          "exist yet, add it to src/components/ads first, then import from " +
          "'@/components/ads'. Do not add a bespoke clone.",
      },
      // TipTap final retirement — CLAUDE.md §20.2 + Rung 4. Two known
      // holdouts remain (CreateStoryModal autoSave, BusinessRequestDetail
      // schema); every other site must use EpicDescriptionEditor.
      {
        group: ["@tiptap/*"],
        message:
          "TipTap is BANNED in new code (CLAUDE.md §20.2). Use the Atlaskit " +
          "editor via EpicDescriptionEditor / EpicDescriptionRenderer from " +
          "'@/components/shared/rich-text/atlaskit'.",
      },
      // Radix direct imports — @atlaskit internally wraps Radix; product
      // code must not reach past the ADS wrapper layer.
      {
        group: ["@radix-ui/*"],
        message:
          "Direct @radix-ui/* imports are BANNED (CLAUDE.md §20.2). Use the " +
          "Catalyst ADS wrapper at '@/components/ads' — Atlaskit wraps Radix " +
          "internally and the ADS wrapper isolates both version-bump surfaces.",
      },
      // Canonical issue-type icon guardrail — bespoke per-feature icon
      // modules ban. Catches future *IssueTypeIcon-named modules
      // (PHIssueTypeIcon, JiraIssueTypeIcon clones, etc.) anywhere in
      // src/ except the canonical one at @/lib/jira-issue-type-icons.
      {
        group: ["**/*IssueTypeIcon", "!@/lib/jira-issue-type-icons"],
        message:
          "Canonical issue-type icons live at '@/lib/jira-issue-type-icons'. " +
          "Bespoke icon modules drift from Atlassian's glyph set — if a new " +
          "type is needed, add it to CONFIGS in jira-issue-type-icons.tsx.",
      },
      // ── 2026-05-03 — RESET ICONS canonical asset guardrail ────────────
      // Direct imports of @/assets/icons/** are banned outside the icon
      // registry. All product code MUST go through the typed components
      // in @/components/icons (WorkItemTypeIcon, PriorityIcon,
      // ProjectAvatar). The registry file itself is exempted via the
      // consumer config block's `ignores` (src/components/icons/**).
      {
        group: ["@/assets/icons/*", "@/assets/icons/**"],
        message:
          "Direct imports of @/assets/icons/** are banned. Use the typed " +
          "components from '@/components/icons' (WorkItemTypeIcon, " +
          "PriorityIcon, ProjectAvatar). To add a new icon: extend " +
          "src/components/icons/icons.registry.ts.",
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
  // BAU Dashboard Atlaskit conversion — per
  // docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 7.
  // Direct @atlaskit/* component imports in these paths are regressions.
  "src/pages/project-hub/ProjectDashboardPage.tsx",
  "src/components/shared/CatalystPageHeader.tsx",
  "src/components/project-hub/dashboard/WidgetWrapper.tsx",
  "src/components/project-hub/dashboard/widgets/**/*.{ts,tsx}",
  // Admin overhaul Phase 0 + 1 — re-architected admin surface lives in
  // src/pages/admin/v2/**, gated by the admin_v2_enabled feature flag.
  // The wiring contract requires 100% Atlaskit primitives via the ADS
  // barrel and forbids direct @atlaskit/* / shadcn imports in this tree.
  "src/pages/admin/v2/**/*.{ts,tsx}",
  "src/components/admin/v2/**/*.{ts,tsx}",
  "src/hooks/admin/useAdminMutation.{ts,tsx}",
  "src/hooks/admin/useAdminV2*.{ts,tsx}",
];

/**
 * Admin v2 — extra hard-error guardrails.
 *
 * Phase 0 of the admin overhaul. Every page under /admin/v2 must use the
 * ADS barrel exclusively, route writes through `useAdminMutation`, and
 * read colours through `var(--ds-*)` or `token('color.*')`. These rules
 * make the wiring contract enforceable from CI.
 *
 *   1. Bare hex / rgba / hsl literals inside style blocks
 *      → use `var(--ds-*, #fallback)`.
 *   2. Raw <input>, <select>, <button> JSX
 *      → use Textfield / Select / Button from @/components/ads.
 *   3. Direct supabase client `.update / .delete / .insert / .upsert`
 *      → route writes through `useAdminMutation` so they hit the audit log.
 *
 * Exceptions are documented inline with `// eslint-disable-next-line` plus a
 * reason comment — typically DB-stored hex values that happen to land in
 * source (status palettes) and are not styling literals.
 */
const adminV2Rules = {
  "no-restricted-syntax": ["error",
    {
      selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
      message:
        "Bare hex literals are banned in admin v2. Use `var(--ds-*, #fallback)` " +
        "or `token('color.*', '#fallback')`. DB-stored hex values must be wrapped " +
        "in an `// eslint-disable-next-line` block with a reason comment.",
    },
    {
      selector: "Literal[value=/^rgba?\\(/]",
      message:
        "rgb()/rgba() literals are banned in admin v2. Use `var(--ds-*)` or " +
        "`token('color.*')`. Document any exception with eslint-disable + reason.",
    },
    {
      selector: "JSXOpeningElement[name.name='input']",
      message:
        "Raw <input> is banned in admin v2 — use `Textfield` from " +
        "'@/components/ads' so styling, dark theme, and a11y stay consistent.",
    },
    {
      selector: "JSXOpeningElement[name.name='select']",
      message:
        "Raw <select> is banned in admin v2 — use `Select` from " +
        "'@/components/ads'.",
    },
    {
      selector: "JSXOpeningElement[name.name='button']",
      message:
        "Raw <button> is banned in admin v2 — use `Button` / `IconButton` from " +
        "'@/components/ads'. For tab-strip / swatch grid edge cases, use " +
        "`<div role=\"button\" tabIndex={0} onKeyDown={…}>` instead.",
    },
    {
      selector:
        "CallExpression[callee.property.name=/^(update|delete|insert|upsert)$/] " +
        "[callee.object.callee.property.name='from']",
      message:
        "Admin v2 writes must route through `useAdminMutation` so the audit log " +
        "captures the actor, before-state, and reason. Direct supabase mutations " +
        "(.update / .delete / .insert / .upsert chained off .from) bypass the trail.",
    },
  ],
};

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
 * BAU Dashboard post-migration guardrails.
 *
 * Per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 7. Flags
 * legacy Catalyst `--cp-*` custom properties — every migrated dashboard
 * surface should read colours / spacing through @atlaskit/tokens
 * `token('color.*', fallbackHex)`. `var(--cp-font-mono)` is the one
 * intentional exception (Catalyst mono stack is narrower than Atlaskit's
 * default), but callers should migrate that too when the font token
 * surface lands.
 */
const dashboardMigratedRules = {
  "no-restricted-syntax": ["warn",
    {
      selector: "Literal[value=/var\\(--cp-(?!font-mono)/]",
      message:
        "BAU Dashboard: migrated surfaces should read colours/spacing through " +
        "@atlaskit/tokens `token('color.*', fallback)` — not `var(--cp-*)`. " +
        "See docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 7.",
    },
    {
      selector: "TemplateElement[value.raw=/var\\(--cp-(?!font-mono)/]",
      message:
        "BAU Dashboard: migrated surfaces should read colours/spacing through " +
        "@atlaskit/tokens `token('color.*', fallback)` — not `var(--cp-*)`. " +
        "See docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 7.",
    },
  ],
};

/**
 * Catalyst design-system colour, typography & asset guardrails.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🛡️  ADS-ONLY DIRECTIVE (Apr 26, 2026 — owner Vikram)
 * ═══════════════════════════════════════════════════════════════════════
 * Catalyst is committed to Atlassian Design System (ADS). All colours,
 * typography, and visual assets in product code MUST come from:
 *   - Colours    →  `token('color.*', fallbackHex)` from @atlaskit/tokens
 *                   or `var(--ds-*)` CSS variables
 *   - Typography →  `<Heading>`, `<Text>` from @atlaskit/heading +
 *                   primitives, OR `token('font.*')`. No bespoke
 *                   `fontFamily` literals.
 *   - Icons      →  Canonical Jira icon registry at
 *                   '@/lib/jira-issue-type-icons' (work-item types) or
 *                   @atlaskit/icon (everything else)
 *   - Assets     →  /admin/icons/jira/* SVGs or @atlaskit/* asset
 *                   modules. No bespoke per-feature SVG files in product
 *                   code.
 *
 * The rules below flag drift back to bespoke / legacy palettes and
 * fonts. Severity = "warn" so 12,000+ pre-existing call sites don't
 * break the build during the migration window. To override on a
 * specific line:
 *
 *   // eslint-disable-next-line no-restricted-syntax -- {reason}
 *   style={{ color: '#FF0000' }}
 *
 * Override usage requires a justification comment. Code reviewers gate
 * the override.
 * ═══════════════════════════════════════════════════════════════════════
 */
const catalystBannedColors = {
  "no-restricted-syntax": ["warn",
    // ── BANNED legacy palette (Golden Hour) ────────────────────────────
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
    // ── Raw HSL literals — Atlaskit doesn't ship HSL fallbacks ─────────
    {
      selector: "Literal[value=/^hsl\\(/]",
      message: "Avoid raw HSL values. Use hex literals or CSS variables. See CLAUDE.md L38.",
    },
    // ── Raw rgb()/rgba() literals — must come from token() fallbacks ───
    {
      selector: "Literal[value=/^rgba?\\(/]",
      message:
        "Raw rgb()/rgba() literals are banned in product code. Use `token('color.*', '#fallback')` " +
        "from @atlaskit/tokens or a `var(--ds-*)` reference. If a transparent overlay is genuinely " +
        "needed, document the exception with `// eslint-disable-next-line` + reason.",
    },
    // ── Bespoke fontFamily literals — Atlaskit owns typography ─────────
    // Catches `style={{ fontFamily: '"Helvetica Neue", sans-serif' }}` and
    // similar. Atlaskit Heading / Text primitives + `token('font.*')` are
    // the canonical surface. Atlassian Sans / monospace variants are
    // exempt because they ARE the canonical stacks.
    {
      selector:
        "JSXAttribute[name.name='style'] Property[key.name='fontFamily'] " +
        "Literal[value!=/Atlassian Sans|JetBrains Mono|ui-monospace|SF Mono|Menlo|Consolas|var\\(--ds-/]",
      message:
        "Bespoke fontFamily literals are banned. Use Atlaskit `<Heading>` / `<Text>` primitives " +
        "or `token('font.*')`. Allowed exceptions: 'Atlassian Sans' (Catalyst default) and the " +
        "monospace stack used for issue keys + tabular numerics.",
    },
  ],
};

/**
 * Tailwind colour-utility ban (Apr 26, 2026).
 *
 * Tailwind utility classes (`bg-red-500`, `text-blue-600`, `border-amber-200`)
 * sidestep the ADS token system entirely — their colours come from the
 * Tailwind palette, not Atlaskit's. Catalyst is committed to ADS; new code
 * must use Atlaskit `token('color.*')` or `var(--ds-*)` instead.
 *
 * Pattern matches:
 *   bg-{red,orange,amber,yellow,lime,green,emerald,teal,cyan,sky,blue,
 *       indigo,violet,purple,fuchsia,pink,rose}-{50..950}
 *   text-, border-, ring-, divide-, fill-, stroke- with the same
 *
 * Severity = "warn". Migrate per-file as widgets get redesigned.
 */
const catalystBannedTailwindColors = {
  "no-restricted-syntax": ["warn",
    {
      selector:
        "Literal[value=/(^|[\\s\"])(bg|text|border|ring|divide|fill|stroke|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)\\b/]",
      message:
        "Tailwind colour utilities (bg-blue-500, text-red-600, etc.) are banned in product code — " +
        "they bypass the ADS token system. Use `token('color.*', '#fallback')` from " +
        "@atlaskit/tokens or `var(--ds-*)` instead. See CLAUDE.md ADS-only directive.",
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
      ...catalystBannedTailwindColors,
    },
  },
  /**
   * Product code — forbid direct @atlaskit/* imports + bespoke icon shims.
   * The exemption patterns below re-enable them for the ADS layer itself
   * and for the WorkItemIcon shim (which delegates to the canonical
   * registry internally — its single allowed import of itself).
   *
   * Severity is "warn" here for atlaskit imports so the 40+ legacy
   * direct-import sites don't break the build. The canonical-icon ban
   * inside makeAdsForbidAtlaskit is at "error" via the migrated-files
   * block below — but at this top level it stays "warn" until the last
   * legacy shim callers are swept.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/components/ads/**",
      "src/theme/ads/**",
      // The shim itself imports the canonical lib internally; exempting
      // its own file from the import ban so the deprecation chain works.
      "src/components/shared/WorkItemIcon.tsx",
      // The icon registry IS the seam where @/assets/icons/** gets
      // imported. Every other consumer must go through this module.
      "src/components/icons/**",
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
  /**
   * BAU Dashboard — post-migration surface. Flags var(--cp-*) drift so
   * new token-migrated widgets don't silently regress back to legacy
   * Catalyst custom properties. See §5 Commit 7 of the conversion blueprint.
   */
  {
    files: [
      "src/pages/project-hub/ProjectDashboardPage.tsx",
      "src/components/project-hub/dashboard/WidgetWrapper.tsx",
      "src/components/project-hub/dashboard/widgets/**/*.{ts,tsx}",
      "src/components/shared/CatalystPageHeader.tsx",
    ],
    rules: {
      ...dashboardMigratedRules,
    },
  },
  /**
   * Admin v2 — Phase 0 + 1 wiring contract. Hard-error guardrails on
   * hex / rgba literals, raw form-element JSX, and direct supabase
   * mutations. See `adminV2Rules` above for the rationale and the list
   * of accepted exception patterns.
   */
  {
    files: [
      "src/pages/admin/v2/**/*.{ts,tsx}",
      "src/components/admin/v2/**/*.{ts,tsx}",
      "src/hooks/admin/useAdminMutation.{ts,tsx}",
      "src/hooks/admin/useAdminV2*.{ts,tsx}",
    ],
    rules: {
      ...adminV2Rules,
    },
  },
);
