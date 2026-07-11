import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";

/**
 * AUTO-SYNC DEPS — runs at vite config load, regardless of launcher.
 *
 * Without this, a pull that adds a new @atlaskit/* package produces:
 *   [plugin:vite:import-analysis] Failed to resolve import "@atlaskit/<pkg>"
 * ...because node_modules hasn't been updated. That happens whether the
 * dev server was started via `bun run dev`, `npm run dev`, direct `vite`,
 * `npx vite --host`, or an IDE launch.json. Running the sync here catches
 * all of them — vite.config.ts is the single entry every launch path
 * eventually executes.
 *
 * The script itself is fingerprint-cached, so on the happy path this
 * adds ~100ms to cold start and 0ms to HMR. It only installs when
 * package.json / lockfiles actually changed since last run.
 */
try {
  spawnSync("node", [path.resolve(__dirname, "scripts/sync-deps.js")], {
    stdio: "inherit",
    cwd: __dirname,
  });
} catch {
  // sync-deps is best-effort — if it can't run, vite's own errors surface
  // the real problem more clearly than anything we'd print here.
}

/**
 * devDepsWatcher — Vite plugin that re-runs sync-deps when package.json
 * or a lockfile changes DURING a running dev session.
 *
 * The config-load sync above covers fresh starts. This plugin handles the
 * scenario where vite is already running, the developer pulls a commit
 * that adds a new @atlaskit/* dep, and HMR tries to transform a module
 * that now imports it. Without the watcher, they'd hit the resolve error
 * until they manually restart vite; with it, we install in the background
 * and trigger vite's own full-reload so the new module is picked up.
 */
function devDepsWatcher(): Plugin {
  const WATCH_FILES = ["package.json", "bun.lock", "bun.lockb", "package-lock.json"];
  let syncing = false;

  return {
    name: "catalyst-dev-deps-watcher",
    apply: "serve",
    configureServer(server) {
      const absPaths = WATCH_FILES.map((f) => path.resolve(__dirname, f));
      server.watcher.add(absPaths);

      const onChange = (file: string) => {
        if (!absPaths.includes(file) || syncing) return;
        syncing = true;
        server.config.logger.info(`[catalyst] ${path.basename(file)} changed — syncing deps…`);
        const r = spawnSync("node", [path.resolve(__dirname, "scripts/sync-deps.js")], {
          stdio: "inherit",
          cwd: __dirname,
        });
        syncing = false;
        if (r.status === 0) {
          server.config.logger.info("[catalyst] deps synced — triggering full reload");
          server.ws.send({ type: "full-reload", path: "*" });
        }
      };

      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
    },
  };
}

/**
 * ADF SCHEMA STAGE0 EXPORT PATCHER
 *
 * @atlaskit/editor-plugin-list v10.2.15 imports stage0 schema variants
 * (listItemWithFlexibleFirstChildStage0, taskListWithFlexibleFirstChildStage0)
 * that don't exist in adf-schema 52.11.4. This plugin intercepts the
 * adf-schema module and appends stub exports for these missing variants,
 * allowing the bundler to satisfy the imports without error.
 *
 * These exports are only used internally by the editor plugins themselves,
 * not by our application source code.
 */
/**
 * EDITOR-TABLES CELL-SELECTION DEDUP
 *
 * @atlaskit/editor-tables/cell-selection calls Selection.jsonID('cell', CellSelection)
 * at module init time — the same JSON ID that Tiptap's prosemirror-tables already
 * registers at app boot. The second registration throws:
 *   RangeError: Duplicate use of selection JSON ID cell
 *
 * Fix: transform the cell-selection module at serve/build time to comment out the
 * duplicate registration. Both editors still share the same CellSelection class via
 * the prosemirror-state module; only the redundant re-registration is removed.
 */
function editorTablesCellSelectionDedup(): Plugin {
  return {
    name: 'editor-tables-cell-selection-dedup',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('@atlaskit/editor-tables') && id.includes('cell-selection')) {
        // Remove the duplicate Selection.jsonID('cell', ...) registration line.
        // The prosemirror-tables package (loaded by Tiptap at boot) already
        // registers this ID; a second call from editor-tables throws RangeError.
        return code.replace(
          /^Selection\.jsonID\s*\(\s*['"]cell['"]\s*,\s*CellSelection\s*\)\s*;?\s*$/m,
          '// Selection.jsonID("cell", CellSelection) — suppressed: already registered by prosemirror-tables (Tiptap)',
        );
      }
    },
  };
}

/**
 * PROSEMIRROR-GAPCURSOR IDEMPOTENT REGISTRATION
 *
 * prosemirror-gapcursor calls `Selection.jsonID("gapcursor", GapCursor)` at
 * module top-level. When the module gets evaluated twice — Vite HMR
 * re-eval, or the rare CJS+ESM dual-resolution that Atlaskit's editor
 * chunk can trigger — the second call throws:
 *   RangeError: Duplicate use of selection JSON ID gapcursor
 *
 * Fix: wrap the registration in a try/catch so re-evaluation is a no-op
 * instead of a hard error. The registry already holds the right entry from
 * the first call, so swallowing the second is safe.
 *
 * Same pattern as editorTablesCellSelectionDedup for the 'cell' ID.
 */
function prosemirrorGapcursorIdempotent(): Plugin {
  return {
    name: 'prosemirror-gapcursor-idempotent',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('prosemirror-gapcursor')) return;
      if (!/dist[/\\]index\.(c?js|mjs)/.test(id)) return;
      // ESM source:  Selection.jsonID("gapcursor", GapCursor);
      // CJS source:  prosemirrorState.Selection.jsonID("gapcursor", GapCursor);
      return code.replace(
        /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]gapcursor['"]\s*,\s*GapCursor\s*\))\s*;?\s*$/m,
        '$1try { $2; } catch (_) { /* gapcursor already registered — second eval (HMR / dual-resolve) is a no-op */ }',
      );
    },
  };
}

/**
 * PROSEMIRROR-TABLES IDEMPOTENT REGISTRATION
 *
 * Same failure shape as gapcursor: prosemirror-tables' top-level
 * `Selection.jsonID("cell", CellSelection)` throws on re-evaluation under
 * HMR or when both Tiptap's table extension AND @atlaskit/editor-tables
 * import it through different bundle paths.
 *
 * editorTablesCellSelectionDedup handles the Atlaskit side; this plugin
 * handles the prosemirror-tables side. Both layers need it because
 * either module can be the "second" registration.
 */
function prosemirrorTablesIdempotent(): Plugin {
  return {
    name: 'prosemirror-tables-idempotent',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('prosemirror-tables')) return;
      if (!/dist[/\\]index\.(c?js|mjs)/.test(id)) return;
      return code.replace(
        /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]cell['"]\s*,\s*CellSelection\s*\))\s*;?\s*$/m,
        '$1try { $2; } catch (_) { /* cell selection already registered — second eval is a no-op */ }',
      );
    },
  };
}

/**
 * PROSEMIRROR-STATE IDEMPOTENT Selection.jsonID — root-cause fix.
 *
 * Patches prosemirror-state's Selection.jsonID method so duplicate
 * registrations return the already-registered class instead of throwing.
 *
 * The per-package shims above (gapcursor, tables, editor-tables) handle
 * one specific call site each. This patch fixes the underlying registry
 * function — covering every current AND future duplicate-jsonID case
 * (e.g. if a future package starts colliding on "node" / "text" / "all"
 * or any custom selection ID).
 *
 * Before:
 *   if (id in classesById)
 *       throw new RangeError("Duplicate use of selection JSON ID " + id);
 *
 * After:
 *   if (id in classesById) {
 *     selectionClass.prototype.jsonID = id;
 *     return classesById[id];
 *   }
 *
 * The replacement still sets the prototype tag on the duplicate class so
 * its instances serialize with the right ID, while keeping the first
 * registered class as the canonical one in the registry.
 */
function prosemirrorStateIdempotentJsonID(): Plugin {
  const REPLACEMENT =
    'if (id in classesById) { selectionClass.prototype.jsonID = id; return classesById[id]; }';
  // Matches both the ESM multi-line form and the CJS single-line form.
  const PATTERN =
    /if\s*\(\s*id\s+in\s+classesById\s*\)\s*\{?\s*throw\s+new\s+RangeError\s*\(\s*["']Duplicate use of selection JSON ID ?["']\s*\+\s*id\s*\)\s*;?\s*\}?/;

  return {
    name: 'prosemirror-state-idempotent-jsonid',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('prosemirror-state')) return;
      if (!/dist[/\\]index\.(c?js|mjs)/.test(id)) return;
      if (!PATTERN.test(code)) return;
      return code.replace(PATTERN, REPLACEMENT);
    },
  };
}

function adfSchemaStagePatcher(): Plugin {
  // Vite/Rollup normalize module IDs to forward slashes even on Windows, but
  // path.resolve() returns OS-native separators (backslashes on Windows).
  // Without normalization the `id === adfSchemaPath` check below silently
  // fails on Windows and the build error returns.
  const adfSchemaPath = path
    .resolve(__dirname, 'node_modules/@atlaskit/adf-schema/dist/esm/index.js')
    .replace(/\\/g, '/');
  const norm = (p: string) => p.replace(/\\/g, '/');

  return {
    name: 'adf-schema-stage0-patcher',
    enforce: 'pre',
    resolveId(source) {
      // Intercept the adf-schema main entry
      if (source === '@atlaskit/adf-schema' || source === '@atlaskit/adf-schema/') {
        return adfSchemaPath;
      }
    },
    load(id) {
      // If this is the adf-schema file, append the missing exports
      if (norm(id) === adfSchemaPath && fs.existsSync(adfSchemaPath)) {
        const originalCode = fs.readFileSync(adfSchemaPath, 'utf-8');
        // Append stub exports for the stage0 variants that editor plugins expect
        const patched = originalCode + '\n' +
          '// Stubs for editor-plugin-list stage0 variants\n' +
          'export const listItemWithFlexibleFirstChildStage0 = undefined;\n' +
          'export const taskListWithFlexibleFirstChildStage0 = undefined;\n';
        return patched;
      }
    },
  };
}

/**
 * ATLASKIT SUBPATH RESOLVER
 *
 * Atlaskit packages use a "subdirectory package.json" pattern for subpath
 * exports: @atlaskit/adf-schema/schema-default resolves to the directory
 * node_modules/@atlaskit/adf-schema/schema-default which contains a
 * package.json with a `module` field. Rollup's default resolver treats the
 * directory as a file and throws ENOENT.
 *
 * This plugin intercepts those imports, reads the subdir package.json,
 * and returns the correct ESM entry path. Covers ALL @atlaskit/* subpaths
 * so we never need to add individual vite aliases per subpath.
 */
function atlaskitSubpathResolver(): Plugin {
  const nodeModules = path.resolve(__dirname, 'node_modules');

  function tryResolveDir(dirPath: string): string | null {
    const pkgJson = path.join(dirPath, 'package.json');
    if (!fs.existsSync(pkgJson)) return null;
    try {
      const meta = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
      const entry = meta['module'] || meta['main'];
      if (!entry) return null;
      return path.resolve(dirPath, entry);
    } catch {
      return null;
    }
  }

  return {
    name: 'atlaskit-subpath-resolver',

    // Vite's alias system does prefix matching, so an alias for
    // @atlaskit/adf-schema also matches @atlaskit/adf-schema/schema-default.
    // After replacement, Rollup gets an absolute path to a DIRECTORY and
    // tries to open it as a file → ENOENT. The load hook intercepts those
    // cases and reads the package.json `module` field to find the real file.
    load(id) {
      if (!path.isAbsolute(id)) return null;
      // Only act on paths inside node_modules/@atlaskit with no file extension.
      if (!id.includes('/node_modules/@atlaskit/')) return null;
      if (path.extname(id) !== '') return null;
      const file = tryResolveDir(id);
      if (!file) return null;
      return `export * from ${JSON.stringify(file)};\nexport { default } from ${JSON.stringify(file)};`;
    },
  };
}

/**
 * RUTHLESS BUILD OPTIMIZER
 * When VITE_ENABLE_FULL_APP is NOT set (Lovable publish),
 * stub out ALL non-essential modules so Rollup never processes them.
 * This eliminates 24+ chunk generation and their entire dependency trees.
 */
function skipHeavyModules(): Plugin {
  const enabled = process.env.VITE_ENABLE_FULL_APP !== 'false';

  // Patterns to stub out during lean builds (publish)
  const STUB_PATTERNS = [
    // Route manifest (700+ routes)
    'FullAppRoutes',
    // Sidebars (15 modules, each with deep dependency trees)
    'UnifiedSidebar',
    'EnterpriseSidebar',
    'ProductRoomSidebar',
    'ProjectSidebar',
    'OperationsSidebar',      // ReleaseRoomSidebar
    'TestManagementSidebar',
    'ReleasesManagementSidebar',
    'ReleaseHubSidebar',
    'IncidentHubSidebar',
    'PlanHubSidebar',
    'TaskHubSidebar',
    'TestHubSidebar',
    'WorkHubSidebar',
    'ProjectHubSidebar',
    'WikiSidebar',
    // Heavy header sub-components
    'CreateDropdown',
    'GlobalSearchPalette',
    'NotificationsPanel',
    'ProgramSelectorDropdown',
    'ProjectSelectorDropdown',
    'ProductSelectorDropdown',
    'MobileNavigationMenu',
    'ReleaseDropdown',
    'CreateEntityDialog',
    // Heavy panels
    'CatalystAIPanel',
    'AnnouncementBanner',
    'ForYouDetailPanel',
  ];

  return {
    name: 'skip-heavy-modules',
    enforce: 'pre',
    resolveId(source) {
      if (enabled) return; // Full app mode — let everything through
      for (const pattern of STUB_PATTERNS) {
        if (source.includes(pattern)) {
          return `\0stub-${pattern}`;
        }
      }
    },
    load(id) {
      if (id.startsWith('\0stub-')) {
        // Return a no-op component that can be used as both default and named export
        return `
          export default function Stub() { return null; }
          export const ${id.replace('\0stub-', '')} = Stub;
        `;
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Only stub modules during production build, never in dev server
  const isBuild = command === 'build';

  return {
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: ['localhost', 'amber-crushable-comrade.ngrok-free.dev'],
    // 2026-05-19 — Exclude dormant modules from file watchers to prevent
    // unnecessary rebuilds when dormant code changes. These modules are
    // intentionally offline and should not trigger HMR.
    watch: {
      ignored: ['**/node_modules/**', '**/src/modules-dormant/**'],
    },
  },
  plugins: [
    editorTablesCellSelectionDedup(),
    prosemirrorGapcursorIdempotent(),
    prosemirrorTablesIdempotent(),
    prosemirrorStateIdempotentJsonID(),
    adfSchemaStagePatcher(),
    atlaskitSubpathResolver(),
    isBuild ? skipHeavyModules() : null,
    !isBuild && devDepsWatcher(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  // @atlaskit packages reference Node's `process.env.NODE_ENV` at module top-level.
  // Shim it for the browser so they don't throw "process is not defined" at load time.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env': '{}',
    'process.platform': '"browser"',
    'process.version': '""',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // @atlaskit/portal v5.5.1 (nested) imports this subpath which doesn't
      // exist as a package export in @atlaskit/app-provider@4.3.0. Point it
      // directly to the ESM implementation file so Vite can resolve it.
      "@atlaskit/app-provider/use-is-inside-theme-provider": path.resolve(__dirname, "./node_modules/@atlaskit/app-provider/dist/esm/theme-provider/hooks/use-is-inside-theme-provider.js"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react-is": path.resolve(__dirname, "./node_modules/react-is"),
      // Force single copy of adf-schema — 15 nested copies each register
      // Step.jsonID("atlaskit-insert-type-ahead") at module load time, causing
      // RangeError "Duplicate use of step JSON ID" on first page load.
      // Root packages: prosemirror-collab, editor-plugin-analytics,
      // editor-plugin-type-ahead, editor-core, editor-common, and 10 others.
      // @atlaskit/adf-schema layout varies by npm version: older npm leaves it
      // nested under @atlaskit/renderer; newer npm hoists it to the top level
      // (it is also a direct dep + override at version 52.6.6, so both copies
      // are the same). Pick whichever physically exists so the dedupe alias
      // still resolves to a single canonical path either way.
      "@atlaskit/adf-schema": (() => {
        const nested = path.resolve(__dirname, "./node_modules/@atlaskit/renderer/node_modules/@atlaskit/adf-schema");
        const hoisted = path.resolve(__dirname, "./node_modules/@atlaskit/adf-schema");
        return fs.existsSync(nested) ? nested : hoisted;
      })(),
      // Browser polyfill for Node's `events` — @atlaskit/editor-plugin-block-controls
      // imports { EventEmitter } from 'events'; Vite treats 'events' as a Node built-in
      // by default, so we force it to the npm `events` package.
      "events": path.resolve(__dirname, "./node_modules/events"),
      // @atlaskit nested deps (e.g. @atlaskit/renderer/node_modules/@atlaskit/task-decision)
      // import bare 'react-intl'. We redirect to @atlaskit's bundled alias
      // `react-intl-next` (which is itself a pinned alias of react-intl@5.18+).
      "react-intl": path.resolve(__dirname, "./node_modules/@atlaskit/renderer/node_modules/react-intl-next/index.js"),
      // Our own code imports `react-intl-next` directly (Atlaskit convention).
      // Pin it to the nested copy shipped with @atlaskit/renderer — guaranteed to
      // exist since we depend on @atlaskit/renderer. The hoisted top-level copy
      // is not reliable across install environments (only present when hoisted).
      "react-intl-next": path.resolve(__dirname, "./node_modules/@atlaskit/renderer/node_modules/react-intl-next/index.js"),
      // @atlaskit/editor-plugins layout varies by npm version: older npm leaves
      // it nested under editor-core, newer npm hoists it to the top level (it
      // is also a direct dep + override at version 13.0.120). Pick whichever
      // physically exists so the dedupe alias resolves to a single canonical
      // path on either layout.
      "@atlaskit/editor-plugins": (() => {
        const nested = path.resolve(__dirname, "./node_modules/@atlaskit/editor-core/node_modules/@atlaskit/editor-plugins");
        const hoisted = path.resolve(__dirname, "./node_modules/@atlaskit/editor-plugins");
        return fs.existsSync(nested) ? nested : hoisted;
      })(),
      // ─────────────────────────────────────────────────────────────────────
      // CRITICAL: Force a SINGLE ProseMirror instance shared by Atlaskit + Tiptap.
      //
      // Atlaskit (@atlaskit/editor-core, @atlaskit/renderer) imports its
      // ProseMirror via `@atlaskit/editor-prosemirror/<subpath>` (an internal
      // wrapper that re-exports pinned prosemirror-* packages). Tiptap imports
      // via `@tiptap/pm/<subpath>` which itself does `export * from 'prosemirror-*'`.
      //
      // If the two trees resolve to DIFFERENT prosemirror-* copies, both
      // register the same selection JSON IDs into a shared registry →
      // RangeError: "Duplicate use of selection JSON ID cell".
      //
      // Fix: route every Atlaskit fork subpath to the upstream `prosemirror-*`
      // package at the top of node_modules. Tiptap's `@tiptap/pm/*` already
      // re-exports those exact same upstream packages (they are deduped via
      // resolve.dedupe below), so both editors share a single instance and
      // the full Atlaskit editor experience is preserved 1:1.
      // ─────────────────────────────────────────────────────────────────────
      "@atlaskit/editor-prosemirror/state": path.resolve(__dirname, "./node_modules/prosemirror-state"),
      "@atlaskit/editor-prosemirror/model": path.resolve(__dirname, "./node_modules/prosemirror-model"),
      "@atlaskit/editor-prosemirror/view": path.resolve(__dirname, "./node_modules/prosemirror-view"),
      "@atlaskit/editor-prosemirror/transform": path.resolve(__dirname, "./node_modules/prosemirror-transform"),
      "@atlaskit/editor-prosemirror/keymap": path.resolve(__dirname, "./node_modules/prosemirror-keymap"),
      "@atlaskit/editor-prosemirror/history": path.resolve(__dirname, "./node_modules/prosemirror-history"),
      "@atlaskit/editor-prosemirror/dropcursor": path.resolve(__dirname, "./node_modules/prosemirror-dropcursor"),
      "@atlaskit/editor-prosemirror/commands": path.resolve(__dirname, "./node_modules/prosemirror-commands"),
      "@atlaskit/editor-prosemirror/utils": path.resolve(__dirname, "./node_modules/prosemirror-utils"),
      "@atlaskit/editor-prosemirror/markdown": path.resolve(__dirname, "./node_modules/prosemirror-markdown"),
      // ADS migration (Phase 1, 2026-05-26): redirect every `import { toast }
      // from 'sonner'` (620 files) to the ADS shim at @/components/ui/sonner.
      // The shim routes all toast.* calls to @atlaskit/flag (showFlag).
      // Zero callsite edits required — the alias intercepts at bundle time.
      "sonner": path.resolve(__dirname, "./src/components/ui/sonner.tsx"),
      // ADS migration (Phase 5, 2026-05-26): redirect every `import toast from
      // 'react-hot-toast'` (12 files, default import) to the same ADS shim.
      // sonner.tsx exports `export default toast` for this pattern.
      // Zero callsite edits required — the alias intercepts at bundle time.
      "react-hot-toast": path.resolve(__dirname, "./src/components/ui/sonner.tsx"),
    },
    // Dedupe prosemirror — belt-and-suspenders alongside the alias above.
    // Add critical Emotion packages for Atlaskit CSS-in-JS
    dedupe: [
      'react',
      'react-dom',
      'react-is',
      // BlockNote's Mantine UI wrapper — pin to a single React-18-safe
      // instance (Mantine 9 renders <Context> directly = React 19 only).
      '@mantine/core',
      '@mantine/hooks',
      'relay-runtime',
      'react-relay',
      '@emotion/react',
      '@emotion/styled',
      '@emotion/serialize',
      '@emotion/utils',
      '@emotion/cache',
      '@emotion/sheet',
      '@emotion/hash',
      '@emotion/memoize',
      '@emotion/weak-memoize',
      '@atlaskit/adf-schema',
      '@atlaskit/editor-plugins',
      '@atlaskit/editor-common',
      'prosemirror-state',
      'prosemirror-model',
      'prosemirror-view',
      'prosemirror-transform',
      'prosemirror-tables',
      '@atlaskit/editor-tables',
      'prosemirror-keymap',
      'prosemirror-commands',
      'prosemirror-history',
      'prosemirror-inputrules',
      'prosemirror-schema-basic',
      'prosemirror-schema-list',
      'prosemirror-dropcursor',
      'prosemirror-gapcursor',
      'prosemirror-menu',
      'prosemirror-utils',
      'prosemirror-changeset',
      'prosemirror-collab',
      'prosemirror-markdown',
      'prosemirror-trailing-node',
      // @atlaskit/feature-gate-js-client is installed at two majors: a hoisted
      // top-level 5.x (required by editor/renderer/smart-card/etc as ^5.x — 5.7.0
      // per the committed package.json; a repo override may pin another 5.x such as
      // 5.8.0) and 6.0.0 (nested, pulled only by @atlaskit/react-compiler-gating@0.2.3
      // as ^6.0.0). Both register a FeatureGateClient singleton at load, so the client
      // logs "Multiple versions of FeatureGateClients found on the current page".
      // Dedupe binds every bare import to the single hoisted 5.x copy regardless of its
      // exact patch, collapsing the 5.x/6.0.0 skew. react-compiler-gating only calls
      // FeatureGates.getExperimentValue (stable across 5.x/6.x), so this is safe.
      '@atlaskit/feature-gate-js-client',
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-is',
      // Emotion CSS-in-JS (required by Atlaskit) - include ALL sub-packages
      '@emotion/react',
      '@emotion/styled',
      '@emotion/serialize',
      '@emotion/utils',
      '@emotion/cache',
      '@emotion/sheet',
      '@emotion/hash',
      '@emotion/memoize',
      '@emotion/weak-memoize',
      // Pre-bundle @atlaskit primitives so SubtasksPanel mount doesn't trigger
      // mid-flight dep re-optimization (which 404s in-flight chunk requests).
      // When adopting a new Atlaskit component in a surface, ADD IT HERE so
      // first render is warm instead of stalling on cold optimize.
      '@atlaskit/atlassian-navigation',
      '@atlaskit/atlassian-navigation/skeleton',
      '@atlaskit/navigation-system',
      '@atlaskit/layering',
      '@atlaskit/avatar',
      '@atlaskit/avatar-group',
      '@atlaskit/badge',
      '@atlaskit/breadcrumbs',
      '@atlaskit/button',
      '@atlaskit/checkbox',
      '@atlaskit/editor-core',
      '@atlaskit/editor-common',
      '@atlaskit/editor-plugin-toolbar',
      '@atlaskit/drawer',
      '@atlaskit/dropdown-menu',
      // @atlaskit/dynamic-table — kept until ProductionIncidentsWidget +
      // QADefectsWidget migrate off ResizableDynamicTable. SubtasksPanel +
      // EpicBacklogTable + ads/DynamicTable have all moved to JiraTable;
      // these dashboard widgets are the last consumers.
      '@atlaskit/dynamic-table',
      '@atlaskit/empty-state',
      '@atlaskit/flag',
      '@atlaskit/form',
      '@atlaskit/heading',
      '@atlaskit/icon',
      '@atlaskit/inline-edit',
      '@atlaskit/lozenge',
      '@atlaskit/link',
      '@atlaskit/datetime-picker',
      '@atlaskit/radio',
      '@atlaskit/progress-bar',
      '@atlaskit/tabs',
      '@atlaskit/menu',
      '@atlaskit/modal-dialog',
      '@atlaskit/user-picker',
      '@atlaskit/page-layout',
      '@atlaskit/popup',
      '@atlaskit/pragmatic-drag-and-drop',
      '@atlaskit/pragmatic-drag-and-drop-auto-scroll',
      '@atlaskit/pragmatic-drag-and-drop-hitbox',
      '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator',
      '@atlaskit/primitives',
      '@atlaskit/section-message',
      '@atlaskit/select',
      '@atlaskit/side-navigation',
      '@atlaskit/spinner',
      '@atlaskit/tag',
      '@atlaskit/textarea',
      '@atlaskit/textfield',
      '@atlaskit/tokens',
      '@atlaskit/tooltip',
      '@atlaskit/toggle',
      'react-window',
      // JiraTable canonical adopted @tanstack/react-virtual on 2026-04-26 for
      // opt-in row virtualization (enableVirtualization prop). Pre-bundling
      // here avoids the optimize-deps cold-restart 500 that hits dynamic
      // imports of BacklogPage / SubtasksPanel right after the dependency
      // first appears in the import graph.
      '@tanstack/react-virtual',
      // Force-pre-bundle the popper chain pulled in transitively by
      // @atlaskit/select + @atlaskit/user-picker. Without explicit entries,
      // vite's hot re-optimize (triggered when a new @atlaskit/* dep lands
      // mid-session) can leave esbuild with a stale manifest and fail with
      //   "Could not resolve ./dom-utils/getLayoutRect.js" in @popperjs/core
      // even though the files are on disk. Listing them here pins stable
      // pre-bundle IDs so the manifest survives re-optimization.
      '@popperjs/core',
      'react-popper',
      // lucide-react exports 1000+ named icon exports (Activity, ActivityIcon, etc).
      // Without pre-bundling, esbuild on-demand optimization can lose exports under HMR,
      // causing ReferenceError: "Activity is not defined" at runtime. Eager pre-bundling
      // guarantees all exports are available when the module first loads.
      'lucide-react',
      // NOTE: @atlaskit/editor-core and @atlaskit/renderer are intentionally
      // EXCLUDED here. They bundle their own ProseMirror tree and clash with
      // Tiptap if eagerly loaded. AtlaskitEditor.tsx lazy-imports editor-core
      // via React.lazy so it only enters the page when an editor is mounted.
      // Pre-bundle prosemirror so editor-core + renderer share ONE instance.
      'prosemirror-state',
      'prosemirror-model',
      'prosemirror-view',
      'prosemirror-transform',
      'prosemirror-tables',
      'prosemirror-keymap',
      'prosemirror-commands',
      'prosemirror-history',
      'prosemirror-schema-list',
      'prosemirror-dropcursor',
      'prosemirror-gapcursor',
      'prosemirror-utils',
      
    ],
    // Mirror the Vite adfSchemaStagePatcher for esbuild's pre-bundling pass.
    // esbuild runs before Vite plugins, so the Rollup load-hook patcher can't
    // intercept @atlaskit/adf-schema during dep optimization. Without this,
    // editor-plugin-list + editor-plugin-tasks-and-decisions fail to resolve
    // listItemWithFlexibleFirstChildStage0 / taskListWithFlexibleFirstChildStage0.
    esbuildOptions: {
      plugins: [
        {
          name: 'adf-schema-stage0-patcher-esbuild',
          setup(build: any) {
            build.onLoad(
              { filter: /adf-schema[/\\]dist[/\\]esm[/\\]index\.js$/ },
              (args: any) => {
                if (!fs.existsSync(args.path)) return null;
                const original = fs.readFileSync(args.path, 'utf-8');
                return {
                  contents:
                    original +
                    '\nexport const listItemWithFlexibleFirstChildStage0 = undefined;\n' +
                    'export const taskListWithFlexibleFirstChildStage0 = undefined;\n',
                  loader: 'js',
                };
              },
            );
          },
        },
        {
          // Mirror of prosemirrorGapcursorIdempotent for the esbuild
          // dep-bundling pass. The Vite transform plugin runs after
          // pre-bundling, so for packages in optimizeDeps.include
          // (prosemirror-gapcursor IS) the patch must also be applied here
          // or the pre-bundled chunk ships the unpatched top-level
          // Selection.jsonID call and HMR re-eval still throws.
          name: 'prosemirror-gapcursor-idempotent-esbuild',
          setup(build: any) {
            build.onLoad(
              { filter: /prosemirror-gapcursor[/\\]dist[/\\]index\.(c?js|mjs)$/ },
              (args: any) => {
                if (!fs.existsSync(args.path)) return null;
                const original = fs.readFileSync(args.path, 'utf-8');
                const patched = original.replace(
                  /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]gapcursor['"]\s*,\s*GapCursor\s*\))\s*;?\s*$/m,
                  '$1try { $2; } catch (_) { /* gapcursor already registered — second eval (HMR / dual-resolve) is a no-op */ }',
                );
                return { contents: patched, loader: 'js' };
              },
            );
          },
        },
        {
          // Mirror of prosemirrorTablesIdempotent for the esbuild
          // dep-bundling pass. prosemirror-tables IS in optimizeDeps.include
          // and registers Selection.jsonID("cell", CellSelection) at module
          // load — patching both passes makes the registration idempotent
          // regardless of which loader path runs first.
          name: 'prosemirror-tables-idempotent-esbuild',
          setup(build: any) {
            build.onLoad(
              { filter: /prosemirror-tables[/\\]dist[/\\]index\.(c?js|mjs)$/ },
              (args: any) => {
                if (!fs.existsSync(args.path)) return null;
                const original = fs.readFileSync(args.path, 'utf-8');
                const patched = original.replace(
                  /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]cell['"]\s*,\s*CellSelection\s*\))\s*;?\s*$/m,
                  '$1try { $2; } catch (_) { /* cell selection already registered — second eval is a no-op */ }',
                );
                return { contents: patched, loader: 'js' };
              },
            );
          },
        },
        {
          // Root-cause fix at the prosemirror-state level — patches
          // Selection.jsonID to be idempotent. Covers every current and
          // future duplicate-selection-ID error, not just gapcursor / cell.
          // Must be applied at the esbuild pass too because
          // prosemirror-state is in optimizeDeps.include and gets
          // pre-bundled before the Vite serve-transform plugin runs.
          name: 'prosemirror-state-idempotent-jsonid-esbuild',
          setup(build: any) {
            const PATTERN =
              /if\s*\(\s*id\s+in\s+classesById\s*\)\s*\{?\s*throw\s+new\s+RangeError\s*\(\s*["']Duplicate use of selection JSON ID ?["']\s*\+\s*id\s*\)\s*;?\s*\}?/;
            const REPLACEMENT =
              'if (id in classesById) { selectionClass.prototype.jsonID = id; return classesById[id]; }';
            build.onLoad(
              { filter: /prosemirror-state[/\\]dist[/\\]index\.(c?js|mjs)$/ },
              (args: any) => {
                if (!fs.existsSync(args.path)) return null;
                const original = fs.readFileSync(args.path, 'utf-8');
                if (!PATTERN.test(original)) return null;
                return { contents: original.replace(PATTERN, REPLACEMENT), loader: 'js' };
              },
            );
          },
        },
      ],
    },
  },
  build: {
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    reportCompressedSize: false,
    rollupOptions: {
      maxParallelFileOps: 3,
      external: ['@atlaskit/media-core', '@atlassian/assets-workspace-host'],
      output: {
        manualChunks(id) {
          // Stable vendor chunks for better long-term caching
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }

          // ═══════════════════════════════════════════════════════════════
          // LAYER 4 — Unified Atlaskit chunk (includes Emotion + editor + UI)
          // ═══════════════════════════════════════════════════════════════
          // 2026-06-08 FINAL FIX: Emotion CSS-in-JS uses closure-scoped helper
          // functions (isProcessableValue, processStyleName, etc.) that CANNOT
          // be accessed across chunk boundaries. When vendor-atlaskit-editor
          // imports css() from vendor-atlaskit-ui, the closures break.
          //
          // Solution: Bundle ALL Atlaskit packages (editor, renderer, UI, AND
          // Emotion) into ONE unified chunk. Yes, it's 46MB unminified, but:
          // - It works (closures stay intact)
          // - User only downloads it once (cached)
          // - Alternative (broken Emotion) is worse than large chunk
          // ═══════════════════════════════════════════════════════════════
          // Unified Atlaskit chunk - editor, renderer, UI, and Emotion together
          // Note: prosemirror is bundled here as an Atlaskit dependency
          if (id.includes('node_modules/@atlaskit/') || id.includes('node_modules/@emotion/')) {
            return 'vendor-atlaskit';
          }
          // @tiptap/* intentionally not split — it's only reached via the
          // (lazy) ConfluenceEditor path; in lean builds it's stubbed out
          // entirely, and in full builds it co-locates fine with whichever
          // route imports it. A dedicated chunk would fail the SW drift
          // verify in lean builds (chunk declared but never produced).

          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // ─── Export libraries: split per-tool ────────────────────────────
          // Previously fused into one ~2.4MB `vendor-export` chunk that any
          // single export action (CSV download, PDF render, PPTX export)
          // would pay in full. They are all dynamic-imported on demand
          // (see src/lib/exportLoaders.ts and friends) — splitting per
          // package means a CSV export pulls ~30KB of papaparse instead
          // of 2.4MB of unrelated tooling.
          if (id.includes('node_modules/exceljs')) return 'vendor-export-exceljs';
          if (id.includes('node_modules/xlsx')) return 'vendor-export-xlsx';
          if (id.includes('node_modules/jspdf-autotable')) return 'vendor-export-jspdf';
          if (id.includes('node_modules/jspdf')) return 'vendor-export-jspdf';
          if (id.includes('node_modules/pptxgenjs')) return 'vendor-export-pptx';
          if (id.includes('node_modules/jszip')) return 'vendor-export-jszip';
          if (id.includes('node_modules/html2canvas')) return 'vendor-export-html2canvas';
          if (id.includes('node_modules/papaparse')) return 'vendor-export-papaparse';
          if (id.includes('node_modules/file-saver')) return 'vendor-export-filesaver';
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          if (id.includes('node_modules/zod') || id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform/')) {
            return 'vendor-forms';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },

    esbuild: {
      drop: ['console'],
    },
  },
};
});
