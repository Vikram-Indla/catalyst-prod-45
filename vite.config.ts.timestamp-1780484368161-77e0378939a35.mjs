// vite.config.ts
import { defineConfig } from "file:///C:/Users/wasim/OneDrive/Desktop/catalyst-prod-45/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/wasim/OneDrive/Desktop/catalyst-prod-45/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { componentTagger } from "file:///C:/Users/wasim/OneDrive/Desktop/catalyst-prod-45/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\wasim\\OneDrive\\Desktop\\catalyst-prod-45";
try {
  spawnSync("node", [path.resolve(__vite_injected_original_dirname, "scripts/sync-deps.js")], {
    stdio: "inherit",
    cwd: __vite_injected_original_dirname
  });
} catch {
}
function devDepsWatcher() {
  const WATCH_FILES = ["package.json", "bun.lock", "bun.lockb", "package-lock.json"];
  let syncing = false;
  return {
    name: "catalyst-dev-deps-watcher",
    apply: "serve",
    configureServer(server) {
      const absPaths = WATCH_FILES.map((f) => path.resolve(__vite_injected_original_dirname, f));
      server.watcher.add(absPaths);
      const onChange = (file) => {
        if (!absPaths.includes(file) || syncing) return;
        syncing = true;
        server.config.logger.info(`[catalyst] ${path.basename(file)} changed \u2014 syncing deps\u2026`);
        const r = spawnSync("node", [path.resolve(__vite_injected_original_dirname, "scripts/sync-deps.js")], {
          stdio: "inherit",
          cwd: __vite_injected_original_dirname
        });
        syncing = false;
        if (r.status === 0) {
          server.config.logger.info("[catalyst] deps synced \u2014 triggering full reload");
          server.ws.send({ type: "full-reload", path: "*" });
        }
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
    }
  };
}
function editorTablesCellSelectionDedup() {
  return {
    name: "editor-tables-cell-selection-dedup",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("@atlaskit/editor-tables") && id.includes("cell-selection")) {
        return code.replace(
          /^Selection\.jsonID\s*\(\s*['"]cell['"]\s*,\s*CellSelection\s*\)\s*;?\s*$/m,
          '// Selection.jsonID("cell", CellSelection) \u2014 suppressed: already registered by prosemirror-tables (Tiptap)'
        );
      }
    }
  };
}
function prosemirrorGapcursorIdempotent() {
  return {
    name: "prosemirror-gapcursor-idempotent",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("prosemirror-gapcursor")) return;
      if (!/dist[/\\]index\.(c?js|mjs)/.test(id)) return;
      return code.replace(
        /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]gapcursor['"]\s*,\s*GapCursor\s*\))\s*;?\s*$/m,
        "$1try { $2; } catch (_) { /* gapcursor already registered \u2014 second eval (HMR / dual-resolve) is a no-op */ }"
      );
    }
  };
}
function prosemirrorTablesIdempotent() {
  return {
    name: "prosemirror-tables-idempotent",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("prosemirror-tables")) return;
      if (!/dist[/\\]index\.(c?js|mjs)/.test(id)) return;
      return code.replace(
        /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]cell['"]\s*,\s*CellSelection\s*\))\s*;?\s*$/m,
        "$1try { $2; } catch (_) { /* cell selection already registered \u2014 second eval is a no-op */ }"
      );
    }
  };
}
function prosemirrorStateIdempotentJsonID() {
  const REPLACEMENT = "if (id in classesById) { selectionClass.prototype.jsonID = id; return classesById[id]; }";
  const PATTERN = /if\s*\(\s*id\s+in\s+classesById\s*\)\s*\{?\s*throw\s+new\s+RangeError\s*\(\s*["']Duplicate use of selection JSON ID ?["']\s*\+\s*id\s*\)\s*;?\s*\}?/;
  return {
    name: "prosemirror-state-idempotent-jsonid",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("prosemirror-state")) return;
      if (!/dist[/\\]index\.(c?js|mjs)/.test(id)) return;
      if (!PATTERN.test(code)) return;
      return code.replace(PATTERN, REPLACEMENT);
    }
  };
}
function adfSchemaStagePatcher() {
  const adfSchemaPath = path.resolve(__vite_injected_original_dirname, "node_modules/@atlaskit/adf-schema/dist/esm/index.js");
  return {
    name: "adf-schema-stage0-patcher",
    enforce: "pre",
    resolveId(source) {
      if (source === "@atlaskit/adf-schema" || source === "@atlaskit/adf-schema/") {
        return adfSchemaPath;
      }
    },
    load(id) {
      if (id === adfSchemaPath && fs.existsSync(adfSchemaPath)) {
        const originalCode = fs.readFileSync(adfSchemaPath, "utf-8");
        const patched = originalCode + "\n// Stubs for editor-plugin-list stage0 variants\nexport const listItemWithFlexibleFirstChildStage0 = undefined;\nexport const taskListWithFlexibleFirstChildStage0 = undefined;\n";
        return patched;
      }
    }
  };
}
function atlaskitSubpathResolver() {
  const nodeModules = path.resolve(__vite_injected_original_dirname, "node_modules");
  function tryResolveDir(dirPath) {
    const pkgJson = path.join(dirPath, "package.json");
    if (!fs.existsSync(pkgJson)) return null;
    try {
      const meta = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
      const entry = meta["module"] || meta["main"];
      if (!entry) return null;
      return path.resolve(dirPath, entry);
    } catch {
      return null;
    }
  }
  return {
    name: "atlaskit-subpath-resolver",
    // Vite's alias system does prefix matching, so an alias for
    // @atlaskit/adf-schema also matches @atlaskit/adf-schema/schema-default.
    // After replacement, Rollup gets an absolute path to a DIRECTORY and
    // tries to open it as a file → ENOENT. The load hook intercepts those
    // cases and reads the package.json `module` field to find the real file.
    load(id) {
      if (!path.isAbsolute(id)) return null;
      if (!id.includes("/node_modules/@atlaskit/")) return null;
      if (path.extname(id) !== "") return null;
      const file = tryResolveDir(id);
      if (!file) return null;
      return `export * from ${JSON.stringify(file)};
export { default } from ${JSON.stringify(file)};`;
    }
  };
}
function skipHeavyModules() {
  const enabled = process.env.VITE_ENABLE_FULL_APP !== "false";
  const STUB_PATTERNS = [
    // Route manifest (700+ routes)
    "FullAppRoutes",
    // Sidebars (15 modules, each with deep dependency trees)
    "UnifiedSidebar",
    "EnterpriseSidebar",
    "ProductRoomSidebar",
    "ProjectSidebar",
    "OperationsSidebar",
    // ReleaseRoomSidebar
    "TestManagementSidebar",
    "ReleasesManagementSidebar",
    "ReleaseHubSidebar",
    "IncidentHubSidebar",
    "PlanHubSidebar",
    "TaskHubSidebar",
    "TestHubSidebar",
    "WorkHubSidebar",
    "ProjectHubSidebar",
    "WikiSidebar",
    // Heavy header sub-components
    "CreateDropdown",
    "GlobalSearchPalette",
    "NotificationsPanel",
    "ProgramSelectorDropdown",
    "ProjectSelectorDropdown",
    "ProductSelectorDropdown",
    "MobileNavigationMenu",
    "ReleaseDropdown",
    "CreateEntityDialog",
    // Heavy panels
    "CatalystAIPanel",
    "AnnouncementBanner",
    "ForYouDetailPanel"
  ];
  return {
    name: "skip-heavy-modules",
    enforce: "pre",
    resolveId(source) {
      if (enabled) return;
      for (const pattern of STUB_PATTERNS) {
        if (source.includes(pattern)) {
          return `\0stub-${pattern}`;
        }
      }
    },
    load(id) {
      if (id.startsWith("\0stub-")) {
        return `
          export default function Stub() { return null; }
          export const ${id.replace("\0stub-", "")} = Stub;
        `;
      }
    }
  };
}
var vite_config_default = defineConfig(({ mode, command }) => {
  const isBuild = command === "build";
  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      allowedHosts: ["localhost", "amber-crushable-comrade.ngrok-free.dev"],
      // 2026-05-19 — Exclude dormant modules from file watchers to prevent
      // unnecessary rebuilds when dormant code changes. These modules are
      // intentionally offline and should not trigger HMR.
      watch: {
        ignored: ["**/node_modules/**", "**/src/modules-dormant/**"]
      }
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
      mode === "development" && componentTagger()
    ].filter(Boolean),
    // @atlaskit packages reference Node's `process.env.NODE_ENV` at module top-level.
    // Shim it for the browser so they don't throw "process is not defined" at load time.
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env": "{}",
      "process.platform": '"browser"',
      "process.version": '""'
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        // @atlaskit/portal v5.5.1 (nested) imports this subpath which doesn't
        // exist as a package export in @atlaskit/app-provider@4.3.0. Point it
        // directly to the ESM implementation file so Vite can resolve it.
        "@atlaskit/app-provider/use-is-inside-theme-provider": path.resolve(__vite_injected_original_dirname, "./node_modules/@atlaskit/app-provider/dist/esm/theme-provider/hooks/use-is-inside-theme-provider.js"),
        "react": path.resolve(__vite_injected_original_dirname, "./node_modules/react"),
        "react-dom": path.resolve(__vite_injected_original_dirname, "./node_modules/react-dom"),
        "react-is": path.resolve(__vite_injected_original_dirname, "./node_modules/react-is"),
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
          const nested = path.resolve(__vite_injected_original_dirname, "./node_modules/@atlaskit/renderer/node_modules/@atlaskit/adf-schema");
          const hoisted = path.resolve(__vite_injected_original_dirname, "./node_modules/@atlaskit/adf-schema");
          return fs.existsSync(nested) ? nested : hoisted;
        })(),
        // Browser polyfill for Node's `events` — @atlaskit/editor-plugin-block-controls
        // imports { EventEmitter } from 'events'; Vite treats 'events' as a Node built-in
        // by default, so we force it to the npm `events` package.
        "events": path.resolve(__vite_injected_original_dirname, "./node_modules/events"),
        // @atlaskit nested deps (e.g. @atlaskit/renderer/node_modules/@atlaskit/task-decision)
        // import bare 'react-intl'. We redirect to @atlaskit's bundled alias
        // `react-intl-next` (which is itself a pinned alias of react-intl@5.18+).
        "react-intl": path.resolve(__vite_injected_original_dirname, "./node_modules/@atlaskit/renderer/node_modules/react-intl-next/index.js"),
        // Our own code imports `react-intl-next` directly (Atlaskit convention).
        // Pin it to the nested copy shipped with @atlaskit/renderer — guaranteed to
        // exist since we depend on @atlaskit/renderer. The hoisted top-level copy
        // is not reliable across install environments (only present when hoisted).
        "react-intl-next": path.resolve(__vite_injected_original_dirname, "./node_modules/@atlaskit/renderer/node_modules/react-intl-next/index.js"),
        // @atlaskit/editor-plugins layout varies by npm version: older npm leaves
        // it nested under editor-core, newer npm hoists it to the top level (it
        // is also a direct dep + override at version 13.0.120). Pick whichever
        // physically exists so the dedupe alias resolves to a single canonical
        // path on either layout.
        "@atlaskit/editor-plugins": (() => {
          const nested = path.resolve(__vite_injected_original_dirname, "./node_modules/@atlaskit/editor-core/node_modules/@atlaskit/editor-plugins");
          const hoisted = path.resolve(__vite_injected_original_dirname, "./node_modules/@atlaskit/editor-plugins");
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
        "@atlaskit/editor-prosemirror/state": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-state"),
        "@atlaskit/editor-prosemirror/model": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-model"),
        "@atlaskit/editor-prosemirror/view": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-view"),
        "@atlaskit/editor-prosemirror/transform": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-transform"),
        "@atlaskit/editor-prosemirror/keymap": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-keymap"),
        "@atlaskit/editor-prosemirror/history": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-history"),
        "@atlaskit/editor-prosemirror/dropcursor": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-dropcursor"),
        "@atlaskit/editor-prosemirror/commands": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-commands"),
        "@atlaskit/editor-prosemirror/utils": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-utils"),
        "@atlaskit/editor-prosemirror/markdown": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-markdown"),
        // ADS migration (Phase 1, 2026-05-26): redirect every `import { toast }
        // from 'sonner'` (620 files) to the ADS shim at @/components/ui/sonner.
        // The shim routes all toast.* calls to @atlaskit/flag (showFlag).
        // Zero callsite edits required — the alias intercepts at bundle time.
        "sonner": path.resolve(__vite_injected_original_dirname, "./src/components/ui/sonner.tsx"),
        // ADS migration (Phase 5, 2026-05-26): redirect every `import toast from
        // 'react-hot-toast'` (12 files, default import) to the same ADS shim.
        // sonner.tsx exports `export default toast` for this pattern.
        // Zero callsite edits required — the alias intercepts at bundle time.
        "react-hot-toast": path.resolve(__vite_injected_original_dirname, "./src/components/ui/sonner.tsx")
      },
      // Dedupe prosemirror — belt-and-suspenders alongside the alias above.
      dedupe: [
        "react",
        "react-dom",
        "react-is",
        "@atlaskit/adf-schema",
        "@atlaskit/editor-plugins",
        "@atlaskit/editor-common",
        "prosemirror-state",
        "prosemirror-model",
        "prosemirror-view",
        "prosemirror-transform",
        "prosemirror-tables",
        "@atlaskit/editor-tables",
        "prosemirror-keymap",
        "prosemirror-commands",
        "prosemirror-history",
        "prosemirror-inputrules",
        "prosemirror-schema-basic",
        "prosemirror-schema-list",
        "prosemirror-dropcursor",
        "prosemirror-gapcursor",
        "prosemirror-menu",
        "prosemirror-utils",
        "prosemirror-changeset",
        "prosemirror-collab",
        "prosemirror-markdown",
        "prosemirror-trailing-node"
      ]
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-is",
        // Pre-bundle @atlaskit primitives so SubtasksPanel mount doesn't trigger
        // mid-flight dep re-optimization (which 404s in-flight chunk requests).
        // When adopting a new Atlaskit component in a surface, ADD IT HERE so
        // first render is warm instead of stalling on cold optimize.
        "@atlaskit/atlassian-navigation",
        "@atlaskit/atlassian-navigation/skeleton",
        "@atlaskit/navigation-system",
        "@atlaskit/layering",
        "@atlaskit/avatar",
        "@atlaskit/avatar-group",
        "@atlaskit/badge",
        "@atlaskit/breadcrumbs",
        "@atlaskit/button",
        "@atlaskit/checkbox",
        "@atlaskit/drawer",
        "@atlaskit/dropdown-menu",
        // @atlaskit/dynamic-table — kept until ProductionIncidentsWidget +
        // QADefectsWidget migrate off ResizableDynamicTable. SubtasksPanel +
        // EpicBacklogTable + ads/DynamicTable have all moved to JiraTable;
        // these dashboard widgets are the last consumers.
        "@atlaskit/dynamic-table",
        "@atlaskit/empty-state",
        "@atlaskit/flag",
        "@atlaskit/form",
        "@atlaskit/heading",
        "@atlaskit/icon",
        "@atlaskit/inline-edit",
        "@atlaskit/lozenge",
        "@atlaskit/link",
        "@atlaskit/datetime-picker",
        "@atlaskit/radio",
        "@atlaskit/progress-bar",
        "@atlaskit/tabs",
        "@atlaskit/menu",
        "@atlaskit/modal-dialog",
        "@atlaskit/user-picker",
        "@atlaskit/page-layout",
        "@atlaskit/popup",
        "@atlaskit/pragmatic-drag-and-drop",
        "@atlaskit/pragmatic-drag-and-drop-auto-scroll",
        "@atlaskit/pragmatic-drag-and-drop-flourish",
        "@atlaskit/pragmatic-drag-and-drop-hitbox",
        "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator",
        "@atlaskit/primitives",
        "@atlaskit/section-message",
        "@atlaskit/select",
        "@atlaskit/side-navigation",
        "@atlaskit/spinner",
        "@atlaskit/tag",
        "@atlaskit/textarea",
        "@atlaskit/textfield",
        "@atlaskit/tokens",
        "@atlaskit/tooltip",
        "@atlaskit/toggle",
        "react-window",
        // JiraTable canonical adopted @tanstack/react-virtual on 2026-04-26 for
        // opt-in row virtualization (enableVirtualization prop). Pre-bundling
        // here avoids the optimize-deps cold-restart 500 that hits dynamic
        // imports of BacklogPage / SubtasksPanel right after the dependency
        // first appears in the import graph.
        "@tanstack/react-virtual",
        // Force-pre-bundle the popper chain pulled in transitively by
        // @atlaskit/select + @atlaskit/user-picker. Without explicit entries,
        // vite's hot re-optimize (triggered when a new @atlaskit/* dep lands
        // mid-session) can leave esbuild with a stale manifest and fail with
        //   "Could not resolve ./dom-utils/getLayoutRect.js" in @popperjs/core
        // even though the files are on disk. Listing them here pins stable
        // pre-bundle IDs so the manifest survives re-optimization.
        "@popperjs/core",
        "react-popper",
        // lucide-react exports 1000+ named icon exports (Activity, ActivityIcon, etc).
        // Without pre-bundling, esbuild on-demand optimization can lose exports under HMR,
        // causing ReferenceError: "Activity is not defined" at runtime. Eager pre-bundling
        // guarantees all exports are available when the module first loads.
        "lucide-react",
        // NOTE: @atlaskit/editor-core and @atlaskit/renderer are intentionally
        // EXCLUDED here. They bundle their own ProseMirror tree and clash with
        // Tiptap if eagerly loaded. AtlaskitEditor.tsx lazy-imports editor-core
        // via React.lazy so it only enters the page when an editor is mounted.
        // Pre-bundle prosemirror so editor-core + renderer share ONE instance.
        "prosemirror-state",
        "prosemirror-model",
        "prosemirror-view",
        "prosemirror-transform",
        "prosemirror-tables",
        "prosemirror-keymap",
        "prosemirror-commands",
        "prosemirror-history",
        "prosemirror-schema-list",
        "prosemirror-dropcursor",
        "prosemirror-gapcursor",
        "prosemirror-utils"
      ],
      // Mirror the Vite adfSchemaStagePatcher for esbuild's pre-bundling pass.
      // esbuild runs before Vite plugins, so the Rollup load-hook patcher can't
      // intercept @atlaskit/adf-schema during dep optimization. Without this,
      // editor-plugin-list + editor-plugin-tasks-and-decisions fail to resolve
      // listItemWithFlexibleFirstChildStage0 / taskListWithFlexibleFirstChildStage0.
      esbuildOptions: {
        plugins: [
          {
            name: "adf-schema-stage0-patcher-esbuild",
            setup(build) {
              build.onLoad(
                { filter: /adf-schema[/\\]dist[/\\]esm[/\\]index\.js$/ },
                (args) => {
                  if (!fs.existsSync(args.path)) return null;
                  const original = fs.readFileSync(args.path, "utf-8");
                  return {
                    contents: original + "\nexport const listItemWithFlexibleFirstChildStage0 = undefined;\nexport const taskListWithFlexibleFirstChildStage0 = undefined;\n",
                    loader: "js"
                  };
                }
              );
            }
          },
          {
            // Mirror of prosemirrorGapcursorIdempotent for the esbuild
            // dep-bundling pass. The Vite transform plugin runs after
            // pre-bundling, so for packages in optimizeDeps.include
            // (prosemirror-gapcursor IS) the patch must also be applied here
            // or the pre-bundled chunk ships the unpatched top-level
            // Selection.jsonID call and HMR re-eval still throws.
            name: "prosemirror-gapcursor-idempotent-esbuild",
            setup(build) {
              build.onLoad(
                { filter: /prosemirror-gapcursor[/\\]dist[/\\]index\.(c?js|mjs)$/ },
                (args) => {
                  if (!fs.existsSync(args.path)) return null;
                  const original = fs.readFileSync(args.path, "utf-8");
                  const patched = original.replace(
                    /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]gapcursor['"]\s*,\s*GapCursor\s*\))\s*;?\s*$/m,
                    "$1try { $2; } catch (_) { /* gapcursor already registered \u2014 second eval (HMR / dual-resolve) is a no-op */ }"
                  );
                  return { contents: patched, loader: "js" };
                }
              );
            }
          },
          {
            // Mirror of prosemirrorTablesIdempotent for the esbuild
            // dep-bundling pass. prosemirror-tables IS in optimizeDeps.include
            // and registers Selection.jsonID("cell", CellSelection) at module
            // load — patching both passes makes the registration idempotent
            // regardless of which loader path runs first.
            name: "prosemirror-tables-idempotent-esbuild",
            setup(build) {
              build.onLoad(
                { filter: /prosemirror-tables[/\\]dist[/\\]index\.(c?js|mjs)$/ },
                (args) => {
                  if (!fs.existsSync(args.path)) return null;
                  const original = fs.readFileSync(args.path, "utf-8");
                  const patched = original.replace(
                    /^(\s*)((?:[\w.]+\.)?Selection\.jsonID\s*\(\s*['"]cell['"]\s*,\s*CellSelection\s*\))\s*;?\s*$/m,
                    "$1try { $2; } catch (_) { /* cell selection already registered \u2014 second eval is a no-op */ }"
                  );
                  return { contents: patched, loader: "js" };
                }
              );
            }
          },
          {
            // Root-cause fix at the prosemirror-state level — patches
            // Selection.jsonID to be idempotent. Covers every current and
            // future duplicate-selection-ID error, not just gapcursor / cell.
            // Must be applied at the esbuild pass too because
            // prosemirror-state is in optimizeDeps.include and gets
            // pre-bundled before the Vite serve-transform plugin runs.
            name: "prosemirror-state-idempotent-jsonid-esbuild",
            setup(build) {
              const PATTERN = /if\s*\(\s*id\s+in\s+classesById\s*\)\s*\{?\s*throw\s+new\s+RangeError\s*\(\s*["']Duplicate use of selection JSON ID ?["']\s*\+\s*id\s*\)\s*;?\s*\}?/;
              const REPLACEMENT = "if (id in classesById) { selectionClass.prototype.jsonID = id; return classesById[id]; }";
              build.onLoad(
                { filter: /prosemirror-state[/\\]dist[/\\]index\.(c?js|mjs)$/ },
                (args) => {
                  if (!fs.existsSync(args.path)) return null;
                  const original = fs.readFileSync(args.path, "utf-8");
                  if (!PATTERN.test(original)) return null;
                  return { contents: original.replace(PATTERN, REPLACEMENT), loader: "js" };
                }
              );
            }
          }
        ]
      }
    },
    build: {
      sourcemap: false,
      target: "esnext",
      chunkSizeWarningLimit: 1200,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router")) {
              return "vendor-react";
            }
            if (id.includes("node_modules/@radix-ui/")) {
              return "vendor-ui";
            }
            if (id.includes("node_modules/@tanstack/")) {
              return "vendor-query";
            }
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3")) {
              return "vendor-charts";
            }
            if (id.includes("node_modules/prosemirror-")) {
              return "vendor-prosemirror";
            }
            if (id.includes("node_modules/@atlaskit/editor-core") || id.includes("node_modules/@atlaskit/editor-common") || id.includes("node_modules/@atlaskit/editor-plugin-") || id.includes("node_modules/@atlaskit/editor-json-transformer") || id.includes("node_modules/@atlaskit/editor-markdown-transformer") || id.includes("node_modules/@atlaskit/editor-palette") || id.includes("node_modules/@atlaskit/editor-performance-metrics") || id.includes("node_modules/@atlaskit/editor-prosemirror") || id.includes("node_modules/@atlaskit/editor-tables")) {
              return "vendor-atlaskit-editor";
            }
            if (id.includes("node_modules/@atlaskit/renderer")) {
              return "vendor-atlaskit-renderer";
            }
            if (id.includes("node_modules/@atlaskit/adf-")) {
              return "vendor-atlaskit-adf";
            }
            if (id.includes("node_modules/@atlaskit/media-")) {
              return "vendor-atlaskit-media";
            }
            if (id.includes("node_modules/@atlaskit/pragmatic-drag-and-drop")) {
              return "vendor-atlaskit-dnd";
            }
            if (id.includes("node_modules/@atlaskit/mention") || id.includes("node_modules/@atlaskit/emoji") || id.includes("node_modules/@atlaskit/smart-card") || id.includes("node_modules/@atlaskit/profilecard") || id.includes("node_modules/@atlaskit/task-decision") || id.includes("node_modules/@atlaskit/status") || id.includes("node_modules/@atlaskit/date")) {
              return "vendor-atlaskit-rich";
            }
            if (id.includes("node_modules/@atlaskit/user-picker") || id.includes("node_modules/@atlaskit/form") || id.includes("node_modules/@atlaskit/dynamic-table") || id.includes("node_modules/@atlaskit/inline-edit") || id.includes("node_modules/@atlaskit/modal-dialog") || id.includes("node_modules/@atlaskit/calendar") || id.includes("node_modules/@atlaskit/datetime-picker") || id.includes("node_modules/@atlaskit/page-layout") || id.includes("node_modules/@atlaskit/atlassian-navigation") || id.includes("node_modules/@atlaskit/menu") || id.includes("node_modules/@atlaskit/dropdown-menu")) {
              return "vendor-atlaskit-forms";
            }
            if (id.includes("node_modules/@atlaskit/")) {
              return "vendor-atlaskit-ui";
            }
            if (id.includes("node_modules/framer-motion")) {
              return "vendor-motion";
            }
            if (id.includes("node_modules/exceljs")) return "vendor-export-exceljs";
            if (id.includes("node_modules/xlsx")) return "vendor-export-xlsx";
            if (id.includes("node_modules/jspdf-autotable")) return "vendor-export-jspdf";
            if (id.includes("node_modules/jspdf")) return "vendor-export-jspdf";
            if (id.includes("node_modules/pptxgenjs")) return "vendor-export-pptx";
            if (id.includes("node_modules/jszip")) return "vendor-export-jszip";
            if (id.includes("node_modules/html2canvas")) return "vendor-export-html2canvas";
            if (id.includes("node_modules/papaparse")) return "vendor-export-papaparse";
            if (id.includes("node_modules/file-saver")) return "vendor-export-filesaver";
            if (id.includes("node_modules/lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("node_modules/date-fns")) {
              return "vendor-date";
            }
            if (id.includes("node_modules/zod") || id.includes("node_modules/react-hook-form") || id.includes("node_modules/@hookform/")) {
              return "vendor-forms";
            }
            if (id.includes("node_modules/@supabase/")) {
              return "vendor-supabase";
            }
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx3YXNpbVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXGNhdGFseXN0LXByb2QtNDVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHdhc2ltXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcY2F0YWx5c3QtcHJvZC00NVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvd2FzaW0vT25lRHJpdmUvRGVza3RvcC9jYXRhbHlzdC1wcm9kLTQ1L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBQbHVnaW4gfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcclxuaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBBVVRPLVNZTkMgREVQUyBcdTIwMTQgcnVucyBhdCB2aXRlIGNvbmZpZyBsb2FkLCByZWdhcmRsZXNzIG9mIGxhdW5jaGVyLlxyXG4gKlxyXG4gKiBXaXRob3V0IHRoaXMsIGEgcHVsbCB0aGF0IGFkZHMgYSBuZXcgQGF0bGFza2l0LyogcGFja2FnZSBwcm9kdWNlczpcclxuICogICBbcGx1Z2luOnZpdGU6aW1wb3J0LWFuYWx5c2lzXSBGYWlsZWQgdG8gcmVzb2x2ZSBpbXBvcnQgXCJAYXRsYXNraXQvPHBrZz5cIlxyXG4gKiAuLi5iZWNhdXNlIG5vZGVfbW9kdWxlcyBoYXNuJ3QgYmVlbiB1cGRhdGVkLiBUaGF0IGhhcHBlbnMgd2hldGhlciB0aGVcclxuICogZGV2IHNlcnZlciB3YXMgc3RhcnRlZCB2aWEgYGJ1biBydW4gZGV2YCwgYG5wbSBydW4gZGV2YCwgZGlyZWN0IGB2aXRlYCxcclxuICogYG5weCB2aXRlIC0taG9zdGAsIG9yIGFuIElERSBsYXVuY2guanNvbi4gUnVubmluZyB0aGUgc3luYyBoZXJlIGNhdGNoZXNcclxuICogYWxsIG9mIHRoZW0gXHUyMDE0IHZpdGUuY29uZmlnLnRzIGlzIHRoZSBzaW5nbGUgZW50cnkgZXZlcnkgbGF1bmNoIHBhdGhcclxuICogZXZlbnR1YWxseSBleGVjdXRlcy5cclxuICpcclxuICogVGhlIHNjcmlwdCBpdHNlbGYgaXMgZmluZ2VycHJpbnQtY2FjaGVkLCBzbyBvbiB0aGUgaGFwcHkgcGF0aCB0aGlzXHJcbiAqIGFkZHMgfjEwMG1zIHRvIGNvbGQgc3RhcnQgYW5kIDBtcyB0byBITVIuIEl0IG9ubHkgaW5zdGFsbHMgd2hlblxyXG4gKiBwYWNrYWdlLmpzb24gLyBsb2NrZmlsZXMgYWN0dWFsbHkgY2hhbmdlZCBzaW5jZSBsYXN0IHJ1bi5cclxuICovXHJcbnRyeSB7XHJcbiAgc3Bhd25TeW5jKFwibm9kZVwiLCBbcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJzY3JpcHRzL3N5bmMtZGVwcy5qc1wiKV0sIHtcclxuICAgIHN0ZGlvOiBcImluaGVyaXRcIixcclxuICAgIGN3ZDogX19kaXJuYW1lLFxyXG4gIH0pO1xyXG59IGNhdGNoIHtcclxuICAvLyBzeW5jLWRlcHMgaXMgYmVzdC1lZmZvcnQgXHUyMDE0IGlmIGl0IGNhbid0IHJ1biwgdml0ZSdzIG93biBlcnJvcnMgc3VyZmFjZVxyXG4gIC8vIHRoZSByZWFsIHByb2JsZW0gbW9yZSBjbGVhcmx5IHRoYW4gYW55dGhpbmcgd2UnZCBwcmludCBoZXJlLlxyXG59XHJcblxyXG4vKipcclxuICogZGV2RGVwc1dhdGNoZXIgXHUyMDE0IFZpdGUgcGx1Z2luIHRoYXQgcmUtcnVucyBzeW5jLWRlcHMgd2hlbiBwYWNrYWdlLmpzb25cclxuICogb3IgYSBsb2NrZmlsZSBjaGFuZ2VzIERVUklORyBhIHJ1bm5pbmcgZGV2IHNlc3Npb24uXHJcbiAqXHJcbiAqIFRoZSBjb25maWctbG9hZCBzeW5jIGFib3ZlIGNvdmVycyBmcmVzaCBzdGFydHMuIFRoaXMgcGx1Z2luIGhhbmRsZXMgdGhlXHJcbiAqIHNjZW5hcmlvIHdoZXJlIHZpdGUgaXMgYWxyZWFkeSBydW5uaW5nLCB0aGUgZGV2ZWxvcGVyIHB1bGxzIGEgY29tbWl0XHJcbiAqIHRoYXQgYWRkcyBhIG5ldyBAYXRsYXNraXQvKiBkZXAsIGFuZCBITVIgdHJpZXMgdG8gdHJhbnNmb3JtIGEgbW9kdWxlXHJcbiAqIHRoYXQgbm93IGltcG9ydHMgaXQuIFdpdGhvdXQgdGhlIHdhdGNoZXIsIHRoZXknZCBoaXQgdGhlIHJlc29sdmUgZXJyb3JcclxuICogdW50aWwgdGhleSBtYW51YWxseSByZXN0YXJ0IHZpdGU7IHdpdGggaXQsIHdlIGluc3RhbGwgaW4gdGhlIGJhY2tncm91bmRcclxuICogYW5kIHRyaWdnZXIgdml0ZSdzIG93biBmdWxsLXJlbG9hZCBzbyB0aGUgbmV3IG1vZHVsZSBpcyBwaWNrZWQgdXAuXHJcbiAqL1xyXG5mdW5jdGlvbiBkZXZEZXBzV2F0Y2hlcigpOiBQbHVnaW4ge1xyXG4gIGNvbnN0IFdBVENIX0ZJTEVTID0gW1wicGFja2FnZS5qc29uXCIsIFwiYnVuLmxvY2tcIiwgXCJidW4ubG9ja2JcIiwgXCJwYWNrYWdlLWxvY2suanNvblwiXTtcclxuICBsZXQgc3luY2luZyA9IGZhbHNlO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogXCJjYXRhbHlzdC1kZXYtZGVwcy13YXRjaGVyXCIsXHJcbiAgICBhcHBseTogXCJzZXJ2ZVwiLFxyXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICBjb25zdCBhYnNQYXRocyA9IFdBVENIX0ZJTEVTLm1hcCgoZikgPT4gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZikpO1xyXG4gICAgICBzZXJ2ZXIud2F0Y2hlci5hZGQoYWJzUGF0aHMpO1xyXG5cclxuICAgICAgY29uc3Qgb25DaGFuZ2UgPSAoZmlsZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgaWYgKCFhYnNQYXRocy5pbmNsdWRlcyhmaWxlKSB8fCBzeW5jaW5nKSByZXR1cm47XHJcbiAgICAgICAgc3luY2luZyA9IHRydWU7XHJcbiAgICAgICAgc2VydmVyLmNvbmZpZy5sb2dnZXIuaW5mbyhgW2NhdGFseXN0XSAke3BhdGguYmFzZW5hbWUoZmlsZSl9IGNoYW5nZWQgXHUyMDE0IHN5bmNpbmcgZGVwc1x1MjAyNmApO1xyXG4gICAgICAgIGNvbnN0IHIgPSBzcGF3blN5bmMoXCJub2RlXCIsIFtwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcInNjcmlwdHMvc3luYy1kZXBzLmpzXCIpXSwge1xyXG4gICAgICAgICAgc3RkaW86IFwiaW5oZXJpdFwiLFxyXG4gICAgICAgICAgY3dkOiBfX2Rpcm5hbWUsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc3luY2luZyA9IGZhbHNlO1xyXG4gICAgICAgIGlmIChyLnN0YXR1cyA9PT0gMCkge1xyXG4gICAgICAgICAgc2VydmVyLmNvbmZpZy5sb2dnZXIuaW5mbyhcIltjYXRhbHlzdF0gZGVwcyBzeW5jZWQgXHUyMDE0IHRyaWdnZXJpbmcgZnVsbCByZWxvYWRcIik7XHJcbiAgICAgICAgICBzZXJ2ZXIud3Muc2VuZCh7IHR5cGU6IFwiZnVsbC1yZWxvYWRcIiwgcGF0aDogXCIqXCIgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VydmVyLndhdGNoZXIub24oXCJjaGFuZ2VcIiwgb25DaGFuZ2UpO1xyXG4gICAgICBzZXJ2ZXIud2F0Y2hlci5vbihcImFkZFwiLCBvbkNoYW5nZSk7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBREYgU0NIRU1BIFNUQUdFMCBFWFBPUlQgUEFUQ0hFUlxyXG4gKlxyXG4gKiBAYXRsYXNraXQvZWRpdG9yLXBsdWdpbi1saXN0IHYxMC4yLjE1IGltcG9ydHMgc3RhZ2UwIHNjaGVtYSB2YXJpYW50c1xyXG4gKiAobGlzdEl0ZW1XaXRoRmxleGlibGVGaXJzdENoaWxkU3RhZ2UwLCB0YXNrTGlzdFdpdGhGbGV4aWJsZUZpcnN0Q2hpbGRTdGFnZTApXHJcbiAqIHRoYXQgZG9uJ3QgZXhpc3QgaW4gYWRmLXNjaGVtYSA1Mi4xMS40LiBUaGlzIHBsdWdpbiBpbnRlcmNlcHRzIHRoZVxyXG4gKiBhZGYtc2NoZW1hIG1vZHVsZSBhbmQgYXBwZW5kcyBzdHViIGV4cG9ydHMgZm9yIHRoZXNlIG1pc3NpbmcgdmFyaWFudHMsXHJcbiAqIGFsbG93aW5nIHRoZSBidW5kbGVyIHRvIHNhdGlzZnkgdGhlIGltcG9ydHMgd2l0aG91dCBlcnJvci5cclxuICpcclxuICogVGhlc2UgZXhwb3J0cyBhcmUgb25seSB1c2VkIGludGVybmFsbHkgYnkgdGhlIGVkaXRvciBwbHVnaW5zIHRoZW1zZWx2ZXMsXHJcbiAqIG5vdCBieSBvdXIgYXBwbGljYXRpb24gc291cmNlIGNvZGUuXHJcbiAqL1xyXG4vKipcclxuICogRURJVE9SLVRBQkxFUyBDRUxMLVNFTEVDVElPTiBERURVUFxyXG4gKlxyXG4gKiBAYXRsYXNraXQvZWRpdG9yLXRhYmxlcy9jZWxsLXNlbGVjdGlvbiBjYWxscyBTZWxlY3Rpb24uanNvbklEKCdjZWxsJywgQ2VsbFNlbGVjdGlvbilcclxuICogYXQgbW9kdWxlIGluaXQgdGltZSBcdTIwMTQgdGhlIHNhbWUgSlNPTiBJRCB0aGF0IFRpcHRhcCdzIHByb3NlbWlycm9yLXRhYmxlcyBhbHJlYWR5XHJcbiAqIHJlZ2lzdGVycyBhdCBhcHAgYm9vdC4gVGhlIHNlY29uZCByZWdpc3RyYXRpb24gdGhyb3dzOlxyXG4gKiAgIFJhbmdlRXJyb3I6IER1cGxpY2F0ZSB1c2Ugb2Ygc2VsZWN0aW9uIEpTT04gSUQgY2VsbFxyXG4gKlxyXG4gKiBGaXg6IHRyYW5zZm9ybSB0aGUgY2VsbC1zZWxlY3Rpb24gbW9kdWxlIGF0IHNlcnZlL2J1aWxkIHRpbWUgdG8gY29tbWVudCBvdXQgdGhlXHJcbiAqIGR1cGxpY2F0ZSByZWdpc3RyYXRpb24uIEJvdGggZWRpdG9ycyBzdGlsbCBzaGFyZSB0aGUgc2FtZSBDZWxsU2VsZWN0aW9uIGNsYXNzIHZpYVxyXG4gKiB0aGUgcHJvc2VtaXJyb3Itc3RhdGUgbW9kdWxlOyBvbmx5IHRoZSByZWR1bmRhbnQgcmUtcmVnaXN0cmF0aW9uIGlzIHJlbW92ZWQuXHJcbiAqL1xyXG5mdW5jdGlvbiBlZGl0b3JUYWJsZXNDZWxsU2VsZWN0aW9uRGVkdXAoKTogUGx1Z2luIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ2VkaXRvci10YWJsZXMtY2VsbC1zZWxlY3Rpb24tZGVkdXAnLFxyXG4gICAgZW5mb3JjZTogJ3ByZScsXHJcbiAgICB0cmFuc2Zvcm0oY29kZSwgaWQpIHtcclxuICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAYXRsYXNraXQvZWRpdG9yLXRhYmxlcycpICYmIGlkLmluY2x1ZGVzKCdjZWxsLXNlbGVjdGlvbicpKSB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBkdXBsaWNhdGUgU2VsZWN0aW9uLmpzb25JRCgnY2VsbCcsIC4uLikgcmVnaXN0cmF0aW9uIGxpbmUuXHJcbiAgICAgICAgLy8gVGhlIHByb3NlbWlycm9yLXRhYmxlcyBwYWNrYWdlIChsb2FkZWQgYnkgVGlwdGFwIGF0IGJvb3QpIGFscmVhZHlcclxuICAgICAgICAvLyByZWdpc3RlcnMgdGhpcyBJRDsgYSBzZWNvbmQgY2FsbCBmcm9tIGVkaXRvci10YWJsZXMgdGhyb3dzIFJhbmdlRXJyb3IuXHJcbiAgICAgICAgcmV0dXJuIGNvZGUucmVwbGFjZShcclxuICAgICAgICAgIC9eU2VsZWN0aW9uXFwuanNvbklEXFxzKlxcKFxccypbJ1wiXWNlbGxbJ1wiXVxccyosXFxzKkNlbGxTZWxlY3Rpb25cXHMqXFwpXFxzKjs/XFxzKiQvbSxcclxuICAgICAgICAgICcvLyBTZWxlY3Rpb24uanNvbklEKFwiY2VsbFwiLCBDZWxsU2VsZWN0aW9uKSBcdTIwMTQgc3VwcHJlc3NlZDogYWxyZWFkeSByZWdpc3RlcmVkIGJ5IHByb3NlbWlycm9yLXRhYmxlcyAoVGlwdGFwKScsXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogUFJPU0VNSVJST1ItR0FQQ1VSU09SIElERU1QT1RFTlQgUkVHSVNUUkFUSU9OXHJcbiAqXHJcbiAqIHByb3NlbWlycm9yLWdhcGN1cnNvciBjYWxscyBgU2VsZWN0aW9uLmpzb25JRChcImdhcGN1cnNvclwiLCBHYXBDdXJzb3IpYCBhdFxyXG4gKiBtb2R1bGUgdG9wLWxldmVsLiBXaGVuIHRoZSBtb2R1bGUgZ2V0cyBldmFsdWF0ZWQgdHdpY2UgXHUyMDE0IFZpdGUgSE1SXHJcbiAqIHJlLWV2YWwsIG9yIHRoZSByYXJlIENKUytFU00gZHVhbC1yZXNvbHV0aW9uIHRoYXQgQXRsYXNraXQncyBlZGl0b3JcclxuICogY2h1bmsgY2FuIHRyaWdnZXIgXHUyMDE0IHRoZSBzZWNvbmQgY2FsbCB0aHJvd3M6XHJcbiAqICAgUmFuZ2VFcnJvcjogRHVwbGljYXRlIHVzZSBvZiBzZWxlY3Rpb24gSlNPTiBJRCBnYXBjdXJzb3JcclxuICpcclxuICogRml4OiB3cmFwIHRoZSByZWdpc3RyYXRpb24gaW4gYSB0cnkvY2F0Y2ggc28gcmUtZXZhbHVhdGlvbiBpcyBhIG5vLW9wXHJcbiAqIGluc3RlYWQgb2YgYSBoYXJkIGVycm9yLiBUaGUgcmVnaXN0cnkgYWxyZWFkeSBob2xkcyB0aGUgcmlnaHQgZW50cnkgZnJvbVxyXG4gKiB0aGUgZmlyc3QgY2FsbCwgc28gc3dhbGxvd2luZyB0aGUgc2Vjb25kIGlzIHNhZmUuXHJcbiAqXHJcbiAqIFNhbWUgcGF0dGVybiBhcyBlZGl0b3JUYWJsZXNDZWxsU2VsZWN0aW9uRGVkdXAgZm9yIHRoZSAnY2VsbCcgSUQuXHJcbiAqL1xyXG5mdW5jdGlvbiBwcm9zZW1pcnJvckdhcGN1cnNvcklkZW1wb3RlbnQoKTogUGx1Z2luIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ3Byb3NlbWlycm9yLWdhcGN1cnNvci1pZGVtcG90ZW50JyxcclxuICAgIGVuZm9yY2U6ICdwcmUnLFxyXG4gICAgdHJhbnNmb3JtKGNvZGUsIGlkKSB7XHJcbiAgICAgIGlmICghaWQuaW5jbHVkZXMoJ3Byb3NlbWlycm9yLWdhcGN1cnNvcicpKSByZXR1cm47XHJcbiAgICAgIGlmICghL2Rpc3RbL1xcXFxdaW5kZXhcXC4oYz9qc3xtanMpLy50ZXN0KGlkKSkgcmV0dXJuO1xyXG4gICAgICAvLyBFU00gc291cmNlOiAgU2VsZWN0aW9uLmpzb25JRChcImdhcGN1cnNvclwiLCBHYXBDdXJzb3IpO1xyXG4gICAgICAvLyBDSlMgc291cmNlOiAgcHJvc2VtaXJyb3JTdGF0ZS5TZWxlY3Rpb24uanNvbklEKFwiZ2FwY3Vyc29yXCIsIEdhcEN1cnNvcik7XHJcbiAgICAgIHJldHVybiBjb2RlLnJlcGxhY2UoXHJcbiAgICAgICAgL14oXFxzKikoKD86W1xcdy5dK1xcLik/U2VsZWN0aW9uXFwuanNvbklEXFxzKlxcKFxccypbJ1wiXWdhcGN1cnNvclsnXCJdXFxzKixcXHMqR2FwQ3Vyc29yXFxzKlxcKSlcXHMqOz9cXHMqJC9tLFxyXG4gICAgICAgICckMXRyeSB7ICQyOyB9IGNhdGNoIChfKSB7IC8qIGdhcGN1cnNvciBhbHJlYWR5IHJlZ2lzdGVyZWQgXHUyMDE0IHNlY29uZCBldmFsIChITVIgLyBkdWFsLXJlc29sdmUpIGlzIGEgbm8tb3AgKi8gfScsXHJcbiAgICAgICk7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQUk9TRU1JUlJPUi1UQUJMRVMgSURFTVBPVEVOVCBSRUdJU1RSQVRJT05cclxuICpcclxuICogU2FtZSBmYWlsdXJlIHNoYXBlIGFzIGdhcGN1cnNvcjogcHJvc2VtaXJyb3ItdGFibGVzJyB0b3AtbGV2ZWxcclxuICogYFNlbGVjdGlvbi5qc29uSUQoXCJjZWxsXCIsIENlbGxTZWxlY3Rpb24pYCB0aHJvd3Mgb24gcmUtZXZhbHVhdGlvbiB1bmRlclxyXG4gKiBITVIgb3Igd2hlbiBib3RoIFRpcHRhcCdzIHRhYmxlIGV4dGVuc2lvbiBBTkQgQGF0bGFza2l0L2VkaXRvci10YWJsZXNcclxuICogaW1wb3J0IGl0IHRocm91Z2ggZGlmZmVyZW50IGJ1bmRsZSBwYXRocy5cclxuICpcclxuICogZWRpdG9yVGFibGVzQ2VsbFNlbGVjdGlvbkRlZHVwIGhhbmRsZXMgdGhlIEF0bGFza2l0IHNpZGU7IHRoaXMgcGx1Z2luXHJcbiAqIGhhbmRsZXMgdGhlIHByb3NlbWlycm9yLXRhYmxlcyBzaWRlLiBCb3RoIGxheWVycyBuZWVkIGl0IGJlY2F1c2VcclxuICogZWl0aGVyIG1vZHVsZSBjYW4gYmUgdGhlIFwic2Vjb25kXCIgcmVnaXN0cmF0aW9uLlxyXG4gKi9cclxuZnVuY3Rpb24gcHJvc2VtaXJyb3JUYWJsZXNJZGVtcG90ZW50KCk6IFBsdWdpbiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIG5hbWU6ICdwcm9zZW1pcnJvci10YWJsZXMtaWRlbXBvdGVudCcsXHJcbiAgICBlbmZvcmNlOiAncHJlJyxcclxuICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xyXG4gICAgICBpZiAoIWlkLmluY2x1ZGVzKCdwcm9zZW1pcnJvci10YWJsZXMnKSkgcmV0dXJuO1xyXG4gICAgICBpZiAoIS9kaXN0Wy9cXFxcXWluZGV4XFwuKGM/anN8bWpzKS8udGVzdChpZCkpIHJldHVybjtcclxuICAgICAgcmV0dXJuIGNvZGUucmVwbGFjZShcclxuICAgICAgICAvXihcXHMqKSgoPzpbXFx3Ll0rXFwuKT9TZWxlY3Rpb25cXC5qc29uSURcXHMqXFwoXFxzKlsnXCJdY2VsbFsnXCJdXFxzKixcXHMqQ2VsbFNlbGVjdGlvblxccypcXCkpXFxzKjs/XFxzKiQvbSxcclxuICAgICAgICAnJDF0cnkgeyAkMjsgfSBjYXRjaCAoXykgeyAvKiBjZWxsIHNlbGVjdGlvbiBhbHJlYWR5IHJlZ2lzdGVyZWQgXHUyMDE0IHNlY29uZCBldmFsIGlzIGEgbm8tb3AgKi8gfScsXHJcbiAgICAgICk7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQUk9TRU1JUlJPUi1TVEFURSBJREVNUE9URU5UIFNlbGVjdGlvbi5qc29uSUQgXHUyMDE0IHJvb3QtY2F1c2UgZml4LlxyXG4gKlxyXG4gKiBQYXRjaGVzIHByb3NlbWlycm9yLXN0YXRlJ3MgU2VsZWN0aW9uLmpzb25JRCBtZXRob2Qgc28gZHVwbGljYXRlXHJcbiAqIHJlZ2lzdHJhdGlvbnMgcmV0dXJuIHRoZSBhbHJlYWR5LXJlZ2lzdGVyZWQgY2xhc3MgaW5zdGVhZCBvZiB0aHJvd2luZy5cclxuICpcclxuICogVGhlIHBlci1wYWNrYWdlIHNoaW1zIGFib3ZlIChnYXBjdXJzb3IsIHRhYmxlcywgZWRpdG9yLXRhYmxlcykgaGFuZGxlXHJcbiAqIG9uZSBzcGVjaWZpYyBjYWxsIHNpdGUgZWFjaC4gVGhpcyBwYXRjaCBmaXhlcyB0aGUgdW5kZXJseWluZyByZWdpc3RyeVxyXG4gKiBmdW5jdGlvbiBcdTIwMTQgY292ZXJpbmcgZXZlcnkgY3VycmVudCBBTkQgZnV0dXJlIGR1cGxpY2F0ZS1qc29uSUQgY2FzZVxyXG4gKiAoZS5nLiBpZiBhIGZ1dHVyZSBwYWNrYWdlIHN0YXJ0cyBjb2xsaWRpbmcgb24gXCJub2RlXCIgLyBcInRleHRcIiAvIFwiYWxsXCJcclxuICogb3IgYW55IGN1c3RvbSBzZWxlY3Rpb24gSUQpLlxyXG4gKlxyXG4gKiBCZWZvcmU6XHJcbiAqICAgaWYgKGlkIGluIGNsYXNzZXNCeUlkKVxyXG4gKiAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIkR1cGxpY2F0ZSB1c2Ugb2Ygc2VsZWN0aW9uIEpTT04gSUQgXCIgKyBpZCk7XHJcbiAqXHJcbiAqIEFmdGVyOlxyXG4gKiAgIGlmIChpZCBpbiBjbGFzc2VzQnlJZCkge1xyXG4gKiAgICAgc2VsZWN0aW9uQ2xhc3MucHJvdG90eXBlLmpzb25JRCA9IGlkO1xyXG4gKiAgICAgcmV0dXJuIGNsYXNzZXNCeUlkW2lkXTtcclxuICogICB9XHJcbiAqXHJcbiAqIFRoZSByZXBsYWNlbWVudCBzdGlsbCBzZXRzIHRoZSBwcm90b3R5cGUgdGFnIG9uIHRoZSBkdXBsaWNhdGUgY2xhc3Mgc29cclxuICogaXRzIGluc3RhbmNlcyBzZXJpYWxpemUgd2l0aCB0aGUgcmlnaHQgSUQsIHdoaWxlIGtlZXBpbmcgdGhlIGZpcnN0XHJcbiAqIHJlZ2lzdGVyZWQgY2xhc3MgYXMgdGhlIGNhbm9uaWNhbCBvbmUgaW4gdGhlIHJlZ2lzdHJ5LlxyXG4gKi9cclxuZnVuY3Rpb24gcHJvc2VtaXJyb3JTdGF0ZUlkZW1wb3RlbnRKc29uSUQoKTogUGx1Z2luIHtcclxuICBjb25zdCBSRVBMQUNFTUVOVCA9XHJcbiAgICAnaWYgKGlkIGluIGNsYXNzZXNCeUlkKSB7IHNlbGVjdGlvbkNsYXNzLnByb3RvdHlwZS5qc29uSUQgPSBpZDsgcmV0dXJuIGNsYXNzZXNCeUlkW2lkXTsgfSc7XHJcbiAgLy8gTWF0Y2hlcyBib3RoIHRoZSBFU00gbXVsdGktbGluZSBmb3JtIGFuZCB0aGUgQ0pTIHNpbmdsZS1saW5lIGZvcm0uXHJcbiAgY29uc3QgUEFUVEVSTiA9XHJcbiAgICAvaWZcXHMqXFwoXFxzKmlkXFxzK2luXFxzK2NsYXNzZXNCeUlkXFxzKlxcKVxccypcXHs/XFxzKnRocm93XFxzK25ld1xccytSYW5nZUVycm9yXFxzKlxcKFxccypbXCInXUR1cGxpY2F0ZSB1c2Ugb2Ygc2VsZWN0aW9uIEpTT04gSUQgP1tcIiddXFxzKlxcK1xccyppZFxccypcXClcXHMqOz9cXHMqXFx9Py87XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAncHJvc2VtaXJyb3Itc3RhdGUtaWRlbXBvdGVudC1qc29uaWQnLFxyXG4gICAgZW5mb3JjZTogJ3ByZScsXHJcbiAgICB0cmFuc2Zvcm0oY29kZSwgaWQpIHtcclxuICAgICAgaWYgKCFpZC5pbmNsdWRlcygncHJvc2VtaXJyb3Itc3RhdGUnKSkgcmV0dXJuO1xyXG4gICAgICBpZiAoIS9kaXN0Wy9cXFxcXWluZGV4XFwuKGM/anN8bWpzKS8udGVzdChpZCkpIHJldHVybjtcclxuICAgICAgaWYgKCFQQVRURVJOLnRlc3QoY29kZSkpIHJldHVybjtcclxuICAgICAgcmV0dXJuIGNvZGUucmVwbGFjZShQQVRURVJOLCBSRVBMQUNFTUVOVCk7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZlNjaGVtYVN0YWdlUGF0Y2hlcigpOiBQbHVnaW4ge1xyXG4gIGNvbnN0IGFkZlNjaGVtYVBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9hZGYtc2NoZW1hL2Rpc3QvZXNtL2luZGV4LmpzJyk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnYWRmLXNjaGVtYS1zdGFnZTAtcGF0Y2hlcicsXHJcbiAgICBlbmZvcmNlOiAncHJlJyxcclxuICAgIHJlc29sdmVJZChzb3VyY2UpIHtcclxuICAgICAgLy8gSW50ZXJjZXB0IHRoZSBhZGYtc2NoZW1hIG1haW4gZW50cnlcclxuICAgICAgaWYgKHNvdXJjZSA9PT0gJ0BhdGxhc2tpdC9hZGYtc2NoZW1hJyB8fCBzb3VyY2UgPT09ICdAYXRsYXNraXQvYWRmLXNjaGVtYS8nKSB7XHJcbiAgICAgICAgcmV0dXJuIGFkZlNjaGVtYVBhdGg7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBsb2FkKGlkKSB7XHJcbiAgICAgIC8vIElmIHRoaXMgaXMgdGhlIGFkZi1zY2hlbWEgZmlsZSwgYXBwZW5kIHRoZSBtaXNzaW5nIGV4cG9ydHNcclxuICAgICAgaWYgKGlkID09PSBhZGZTY2hlbWFQYXRoICYmIGZzLmV4aXN0c1N5bmMoYWRmU2NoZW1hUGF0aCkpIHtcclxuICAgICAgICBjb25zdCBvcmlnaW5hbENvZGUgPSBmcy5yZWFkRmlsZVN5bmMoYWRmU2NoZW1hUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgLy8gQXBwZW5kIHN0dWIgZXhwb3J0cyBmb3IgdGhlIHN0YWdlMCB2YXJpYW50cyB0aGF0IGVkaXRvciBwbHVnaW5zIGV4cGVjdFxyXG4gICAgICAgIGNvbnN0IHBhdGNoZWQgPSBvcmlnaW5hbENvZGUgKyAnXFxuJyArXHJcbiAgICAgICAgICAnLy8gU3R1YnMgZm9yIGVkaXRvci1wbHVnaW4tbGlzdCBzdGFnZTAgdmFyaWFudHNcXG4nICtcclxuICAgICAgICAgICdleHBvcnQgY29uc3QgbGlzdEl0ZW1XaXRoRmxleGlibGVGaXJzdENoaWxkU3RhZ2UwID0gdW5kZWZpbmVkO1xcbicgK1xyXG4gICAgICAgICAgJ2V4cG9ydCBjb25zdCB0YXNrTGlzdFdpdGhGbGV4aWJsZUZpcnN0Q2hpbGRTdGFnZTAgPSB1bmRlZmluZWQ7XFxuJztcclxuICAgICAgICByZXR1cm4gcGF0Y2hlZDtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQVRMQVNLSVQgU1VCUEFUSCBSRVNPTFZFUlxyXG4gKlxyXG4gKiBBdGxhc2tpdCBwYWNrYWdlcyB1c2UgYSBcInN1YmRpcmVjdG9yeSBwYWNrYWdlLmpzb25cIiBwYXR0ZXJuIGZvciBzdWJwYXRoXHJcbiAqIGV4cG9ydHM6IEBhdGxhc2tpdC9hZGYtc2NoZW1hL3NjaGVtYS1kZWZhdWx0IHJlc29sdmVzIHRvIHRoZSBkaXJlY3RvcnlcclxuICogbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9hZGYtc2NoZW1hL3NjaGVtYS1kZWZhdWx0IHdoaWNoIGNvbnRhaW5zIGFcclxuICogcGFja2FnZS5qc29uIHdpdGggYSBgbW9kdWxlYCBmaWVsZC4gUm9sbHVwJ3MgZGVmYXVsdCByZXNvbHZlciB0cmVhdHMgdGhlXHJcbiAqIGRpcmVjdG9yeSBhcyBhIGZpbGUgYW5kIHRocm93cyBFTk9FTlQuXHJcbiAqXHJcbiAqIFRoaXMgcGx1Z2luIGludGVyY2VwdHMgdGhvc2UgaW1wb3J0cywgcmVhZHMgdGhlIHN1YmRpciBwYWNrYWdlLmpzb24sXHJcbiAqIGFuZCByZXR1cm5zIHRoZSBjb3JyZWN0IEVTTSBlbnRyeSBwYXRoLiBDb3ZlcnMgQUxMIEBhdGxhc2tpdC8qIHN1YnBhdGhzXHJcbiAqIHNvIHdlIG5ldmVyIG5lZWQgdG8gYWRkIGluZGl2aWR1YWwgdml0ZSBhbGlhc2VzIHBlciBzdWJwYXRoLlxyXG4gKi9cclxuZnVuY3Rpb24gYXRsYXNraXRTdWJwYXRoUmVzb2x2ZXIoKTogUGx1Z2luIHtcclxuICBjb25zdCBub2RlTW9kdWxlcyA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMnKTtcclxuXHJcbiAgZnVuY3Rpb24gdHJ5UmVzb2x2ZURpcihkaXJQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgIGNvbnN0IHBrZ0pzb24gPSBwYXRoLmpvaW4oZGlyUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xyXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHBrZ0pzb24pKSByZXR1cm4gbnVsbDtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1ldGEgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa2dKc29uLCAndXRmOCcpKTtcclxuICAgICAgY29uc3QgZW50cnkgPSBtZXRhWydtb2R1bGUnXSB8fCBtZXRhWydtYWluJ107XHJcbiAgICAgIGlmICghZW50cnkpIHJldHVybiBudWxsO1xyXG4gICAgICByZXR1cm4gcGF0aC5yZXNvbHZlKGRpclBhdGgsIGVudHJ5KTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnYXRsYXNraXQtc3VicGF0aC1yZXNvbHZlcicsXHJcblxyXG4gICAgLy8gVml0ZSdzIGFsaWFzIHN5c3RlbSBkb2VzIHByZWZpeCBtYXRjaGluZywgc28gYW4gYWxpYXMgZm9yXHJcbiAgICAvLyBAYXRsYXNraXQvYWRmLXNjaGVtYSBhbHNvIG1hdGNoZXMgQGF0bGFza2l0L2FkZi1zY2hlbWEvc2NoZW1hLWRlZmF1bHQuXHJcbiAgICAvLyBBZnRlciByZXBsYWNlbWVudCwgUm9sbHVwIGdldHMgYW4gYWJzb2x1dGUgcGF0aCB0byBhIERJUkVDVE9SWSBhbmRcclxuICAgIC8vIHRyaWVzIHRvIG9wZW4gaXQgYXMgYSBmaWxlIFx1MjE5MiBFTk9FTlQuIFRoZSBsb2FkIGhvb2sgaW50ZXJjZXB0cyB0aG9zZVxyXG4gICAgLy8gY2FzZXMgYW5kIHJlYWRzIHRoZSBwYWNrYWdlLmpzb24gYG1vZHVsZWAgZmllbGQgdG8gZmluZCB0aGUgcmVhbCBmaWxlLlxyXG4gICAgbG9hZChpZCkge1xyXG4gICAgICBpZiAoIXBhdGguaXNBYnNvbHV0ZShpZCkpIHJldHVybiBudWxsO1xyXG4gICAgICAvLyBPbmx5IGFjdCBvbiBwYXRocyBpbnNpZGUgbm9kZV9tb2R1bGVzL0BhdGxhc2tpdCB3aXRoIG5vIGZpbGUgZXh0ZW5zaW9uLlxyXG4gICAgICBpZiAoIWlkLmluY2x1ZGVzKCcvbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC8nKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgIGlmIChwYXRoLmV4dG5hbWUoaWQpICE9PSAnJykgcmV0dXJuIG51bGw7XHJcbiAgICAgIGNvbnN0IGZpbGUgPSB0cnlSZXNvbHZlRGlyKGlkKTtcclxuICAgICAgaWYgKCFmaWxlKSByZXR1cm4gbnVsbDtcclxuICAgICAgcmV0dXJuIGBleHBvcnQgKiBmcm9tICR7SlNPTi5zdHJpbmdpZnkoZmlsZSl9O1xcbmV4cG9ydCB7IGRlZmF1bHQgfSBmcm9tICR7SlNPTi5zdHJpbmdpZnkoZmlsZSl9O2A7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSVVRITEVTUyBCVUlMRCBPUFRJTUlaRVJcclxuICogV2hlbiBWSVRFX0VOQUJMRV9GVUxMX0FQUCBpcyBOT1Qgc2V0IChMb3ZhYmxlIHB1Ymxpc2gpLFxyXG4gKiBzdHViIG91dCBBTEwgbm9uLWVzc2VudGlhbCBtb2R1bGVzIHNvIFJvbGx1cCBuZXZlciBwcm9jZXNzZXMgdGhlbS5cclxuICogVGhpcyBlbGltaW5hdGVzIDI0KyBjaHVuayBnZW5lcmF0aW9uIGFuZCB0aGVpciBlbnRpcmUgZGVwZW5kZW5jeSB0cmVlcy5cclxuICovXHJcbmZ1bmN0aW9uIHNraXBIZWF2eU1vZHVsZXMoKTogUGx1Z2luIHtcclxuICBjb25zdCBlbmFibGVkID0gcHJvY2Vzcy5lbnYuVklURV9FTkFCTEVfRlVMTF9BUFAgIT09ICdmYWxzZSc7XHJcblxyXG4gIC8vIFBhdHRlcm5zIHRvIHN0dWIgb3V0IGR1cmluZyBsZWFuIGJ1aWxkcyAocHVibGlzaClcclxuICBjb25zdCBTVFVCX1BBVFRFUk5TID0gW1xyXG4gICAgLy8gUm91dGUgbWFuaWZlc3QgKDcwMCsgcm91dGVzKVxyXG4gICAgJ0Z1bGxBcHBSb3V0ZXMnLFxyXG4gICAgLy8gU2lkZWJhcnMgKDE1IG1vZHVsZXMsIGVhY2ggd2l0aCBkZWVwIGRlcGVuZGVuY3kgdHJlZXMpXHJcbiAgICAnVW5pZmllZFNpZGViYXInLFxyXG4gICAgJ0VudGVycHJpc2VTaWRlYmFyJyxcclxuICAgICdQcm9kdWN0Um9vbVNpZGViYXInLFxyXG4gICAgJ1Byb2plY3RTaWRlYmFyJyxcclxuICAgICdPcGVyYXRpb25zU2lkZWJhcicsICAgICAgLy8gUmVsZWFzZVJvb21TaWRlYmFyXHJcbiAgICAnVGVzdE1hbmFnZW1lbnRTaWRlYmFyJyxcclxuICAgICdSZWxlYXNlc01hbmFnZW1lbnRTaWRlYmFyJyxcclxuICAgICdSZWxlYXNlSHViU2lkZWJhcicsXHJcbiAgICAnSW5jaWRlbnRIdWJTaWRlYmFyJyxcclxuICAgICdQbGFuSHViU2lkZWJhcicsXHJcbiAgICAnVGFza0h1YlNpZGViYXInLFxyXG4gICAgJ1Rlc3RIdWJTaWRlYmFyJyxcclxuICAgICdXb3JrSHViU2lkZWJhcicsXHJcbiAgICAnUHJvamVjdEh1YlNpZGViYXInLFxyXG4gICAgJ1dpa2lTaWRlYmFyJyxcclxuICAgIC8vIEhlYXZ5IGhlYWRlciBzdWItY29tcG9uZW50c1xyXG4gICAgJ0NyZWF0ZURyb3Bkb3duJyxcclxuICAgICdHbG9iYWxTZWFyY2hQYWxldHRlJyxcclxuICAgICdOb3RpZmljYXRpb25zUGFuZWwnLFxyXG4gICAgJ1Byb2dyYW1TZWxlY3RvckRyb3Bkb3duJyxcclxuICAgICdQcm9qZWN0U2VsZWN0b3JEcm9wZG93bicsXHJcbiAgICAnUHJvZHVjdFNlbGVjdG9yRHJvcGRvd24nLFxyXG4gICAgJ01vYmlsZU5hdmlnYXRpb25NZW51JyxcclxuICAgICdSZWxlYXNlRHJvcGRvd24nLFxyXG4gICAgJ0NyZWF0ZUVudGl0eURpYWxvZycsXHJcbiAgICAvLyBIZWF2eSBwYW5lbHNcclxuICAgICdDYXRhbHlzdEFJUGFuZWwnLFxyXG4gICAgJ0Fubm91bmNlbWVudEJhbm5lcicsXHJcbiAgICAnRm9yWW91RGV0YWlsUGFuZWwnLFxyXG4gIF07XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnc2tpcC1oZWF2eS1tb2R1bGVzJyxcclxuICAgIGVuZm9yY2U6ICdwcmUnLFxyXG4gICAgcmVzb2x2ZUlkKHNvdXJjZSkge1xyXG4gICAgICBpZiAoZW5hYmxlZCkgcmV0dXJuOyAvLyBGdWxsIGFwcCBtb2RlIFx1MjAxNCBsZXQgZXZlcnl0aGluZyB0aHJvdWdoXHJcbiAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBTVFVCX1BBVFRFUk5TKSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZS5pbmNsdWRlcyhwYXR0ZXJuKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGBcXDBzdHViLSR7cGF0dGVybn1gO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGxvYWQoaWQpIHtcclxuICAgICAgaWYgKGlkLnN0YXJ0c1dpdGgoJ1xcMHN0dWItJykpIHtcclxuICAgICAgICAvLyBSZXR1cm4gYSBuby1vcCBjb21wb25lbnQgdGhhdCBjYW4gYmUgdXNlZCBhcyBib3RoIGRlZmF1bHQgYW5kIG5hbWVkIGV4cG9ydFxyXG4gICAgICAgIHJldHVybiBgXHJcbiAgICAgICAgICBleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTdHViKCkgeyByZXR1cm4gbnVsbDsgfVxyXG4gICAgICAgICAgZXhwb3J0IGNvbnN0ICR7aWQucmVwbGFjZSgnXFwwc3R1Yi0nLCAnJyl9ID0gU3R1YjtcclxuICAgICAgICBgO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlLCBjb21tYW5kIH0pID0+IHtcclxuICAvLyBPbmx5IHN0dWIgbW9kdWxlcyBkdXJpbmcgcHJvZHVjdGlvbiBidWlsZCwgbmV2ZXIgaW4gZGV2IHNlcnZlclxyXG4gIGNvbnN0IGlzQnVpbGQgPSBjb21tYW5kID09PSAnYnVpbGQnO1xyXG5cclxuICByZXR1cm4ge1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCIwLjAuMC4wXCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgIGFsbG93ZWRIb3N0czogWydsb2NhbGhvc3QnLCAnYW1iZXItY3J1c2hhYmxlLWNvbXJhZGUubmdyb2stZnJlZS5kZXYnXSxcclxuICAgIC8vIDIwMjYtMDUtMTkgXHUyMDE0IEV4Y2x1ZGUgZG9ybWFudCBtb2R1bGVzIGZyb20gZmlsZSB3YXRjaGVycyB0byBwcmV2ZW50XHJcbiAgICAvLyB1bm5lY2Vzc2FyeSByZWJ1aWxkcyB3aGVuIGRvcm1hbnQgY29kZSBjaGFuZ2VzLiBUaGVzZSBtb2R1bGVzIGFyZVxyXG4gICAgLy8gaW50ZW50aW9uYWxseSBvZmZsaW5lIGFuZCBzaG91bGQgbm90IHRyaWdnZXIgSE1SLlxyXG4gICAgd2F0Y2g6IHtcclxuICAgICAgaWdub3JlZDogWycqKi9ub2RlX21vZHVsZXMvKionLCAnKiovc3JjL21vZHVsZXMtZG9ybWFudC8qKiddLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIGVkaXRvclRhYmxlc0NlbGxTZWxlY3Rpb25EZWR1cCgpLFxyXG4gICAgcHJvc2VtaXJyb3JHYXBjdXJzb3JJZGVtcG90ZW50KCksXHJcbiAgICBwcm9zZW1pcnJvclRhYmxlc0lkZW1wb3RlbnQoKSxcclxuICAgIHByb3NlbWlycm9yU3RhdGVJZGVtcG90ZW50SnNvbklEKCksXHJcbiAgICBhZGZTY2hlbWFTdGFnZVBhdGNoZXIoKSxcclxuICAgIGF0bGFza2l0U3VicGF0aFJlc29sdmVyKCksXHJcbiAgICBpc0J1aWxkID8gc2tpcEhlYXZ5TW9kdWxlcygpIDogbnVsbCxcclxuICAgICFpc0J1aWxkICYmIGRldkRlcHNXYXRjaGVyKCksXHJcbiAgICByZWFjdCgpLFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIC8vIEBhdGxhc2tpdCBwYWNrYWdlcyByZWZlcmVuY2UgTm9kZSdzIGBwcm9jZXNzLmVudi5OT0RFX0VOVmAgYXQgbW9kdWxlIHRvcC1sZXZlbC5cclxuICAvLyBTaGltIGl0IGZvciB0aGUgYnJvd3NlciBzbyB0aGV5IGRvbid0IHRocm93IFwicHJvY2VzcyBpcyBub3QgZGVmaW5lZFwiIGF0IGxvYWQgdGltZS5cclxuICBkZWZpbmU6IHtcclxuICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KG1vZGUpLFxyXG4gICAgJ3Byb2Nlc3MuZW52JzogJ3t9JyxcclxuICAgICdwcm9jZXNzLnBsYXRmb3JtJzogJ1wiYnJvd3NlclwiJyxcclxuICAgICdwcm9jZXNzLnZlcnNpb24nOiAnXCJcIicsXHJcbiAgfSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgLy8gQGF0bGFza2l0L3BvcnRhbCB2NS41LjEgKG5lc3RlZCkgaW1wb3J0cyB0aGlzIHN1YnBhdGggd2hpY2ggZG9lc24ndFxyXG4gICAgICAvLyBleGlzdCBhcyBhIHBhY2thZ2UgZXhwb3J0IGluIEBhdGxhc2tpdC9hcHAtcHJvdmlkZXJANC4zLjAuIFBvaW50IGl0XHJcbiAgICAgIC8vIGRpcmVjdGx5IHRvIHRoZSBFU00gaW1wbGVtZW50YXRpb24gZmlsZSBzbyBWaXRlIGNhbiByZXNvbHZlIGl0LlxyXG4gICAgICBcIkBhdGxhc2tpdC9hcHAtcHJvdmlkZXIvdXNlLWlzLWluc2lkZS10aGVtZS1wcm92aWRlclwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9hcHAtcHJvdmlkZXIvZGlzdC9lc20vdGhlbWUtcHJvdmlkZXIvaG9va3MvdXNlLWlzLWluc2lkZS10aGVtZS1wcm92aWRlci5qc1wiKSxcclxuICAgICAgXCJyZWFjdFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3JlYWN0XCIpLFxyXG4gICAgICBcInJlYWN0LWRvbVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3JlYWN0LWRvbVwiKSxcclxuICAgICAgXCJyZWFjdC1pc1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3JlYWN0LWlzXCIpLFxyXG4gICAgICAvLyBGb3JjZSBzaW5nbGUgY29weSBvZiBhZGYtc2NoZW1hIFx1MjAxNCAxNSBuZXN0ZWQgY29waWVzIGVhY2ggcmVnaXN0ZXJcclxuICAgICAgLy8gU3RlcC5qc29uSUQoXCJhdGxhc2tpdC1pbnNlcnQtdHlwZS1haGVhZFwiKSBhdCBtb2R1bGUgbG9hZCB0aW1lLCBjYXVzaW5nXHJcbiAgICAgIC8vIFJhbmdlRXJyb3IgXCJEdXBsaWNhdGUgdXNlIG9mIHN0ZXAgSlNPTiBJRFwiIG9uIGZpcnN0IHBhZ2UgbG9hZC5cclxuICAgICAgLy8gUm9vdCBwYWNrYWdlczogcHJvc2VtaXJyb3ItY29sbGFiLCBlZGl0b3ItcGx1Z2luLWFuYWx5dGljcyxcclxuICAgICAgLy8gZWRpdG9yLXBsdWdpbi10eXBlLWFoZWFkLCBlZGl0b3ItY29yZSwgZWRpdG9yLWNvbW1vbiwgYW5kIDEwIG90aGVycy5cclxuICAgICAgLy8gQGF0bGFza2l0L2FkZi1zY2hlbWEgbGF5b3V0IHZhcmllcyBieSBucG0gdmVyc2lvbjogb2xkZXIgbnBtIGxlYXZlcyBpdFxyXG4gICAgICAvLyBuZXN0ZWQgdW5kZXIgQGF0bGFza2l0L3JlbmRlcmVyOyBuZXdlciBucG0gaG9pc3RzIGl0IHRvIHRoZSB0b3AgbGV2ZWxcclxuICAgICAgLy8gKGl0IGlzIGFsc28gYSBkaXJlY3QgZGVwICsgb3ZlcnJpZGUgYXQgdmVyc2lvbiA1Mi42LjYsIHNvIGJvdGggY29waWVzXHJcbiAgICAgIC8vIGFyZSB0aGUgc2FtZSkuIFBpY2sgd2hpY2hldmVyIHBoeXNpY2FsbHkgZXhpc3RzIHNvIHRoZSBkZWR1cGUgYWxpYXNcclxuICAgICAgLy8gc3RpbGwgcmVzb2x2ZXMgdG8gYSBzaW5nbGUgY2Fub25pY2FsIHBhdGggZWl0aGVyIHdheS5cclxuICAgICAgXCJAYXRsYXNraXQvYWRmLXNjaGVtYVwiOiAoKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IG5lc3RlZCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvQGF0bGFza2l0L3JlbmRlcmVyL25vZGVfbW9kdWxlcy9AYXRsYXNraXQvYWRmLXNjaGVtYVwiKTtcclxuICAgICAgICBjb25zdCBob2lzdGVkID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9AYXRsYXNraXQvYWRmLXNjaGVtYVwiKTtcclxuICAgICAgICByZXR1cm4gZnMuZXhpc3RzU3luYyhuZXN0ZWQpID8gbmVzdGVkIDogaG9pc3RlZDtcclxuICAgICAgfSkoKSxcclxuICAgICAgLy8gQnJvd3NlciBwb2x5ZmlsbCBmb3IgTm9kZSdzIGBldmVudHNgIFx1MjAxNCBAYXRsYXNraXQvZWRpdG9yLXBsdWdpbi1ibG9jay1jb250cm9sc1xyXG4gICAgICAvLyBpbXBvcnRzIHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJzsgVml0ZSB0cmVhdHMgJ2V2ZW50cycgYXMgYSBOb2RlIGJ1aWx0LWluXHJcbiAgICAgIC8vIGJ5IGRlZmF1bHQsIHNvIHdlIGZvcmNlIGl0IHRvIHRoZSBucG0gYGV2ZW50c2AgcGFja2FnZS5cclxuICAgICAgXCJldmVudHNcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9ldmVudHNcIiksXHJcbiAgICAgIC8vIEBhdGxhc2tpdCBuZXN0ZWQgZGVwcyAoZS5nLiBAYXRsYXNraXQvcmVuZGVyZXIvbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC90YXNrLWRlY2lzaW9uKVxyXG4gICAgICAvLyBpbXBvcnQgYmFyZSAncmVhY3QtaW50bCcuIFdlIHJlZGlyZWN0IHRvIEBhdGxhc2tpdCdzIGJ1bmRsZWQgYWxpYXNcclxuICAgICAgLy8gYHJlYWN0LWludGwtbmV4dGAgKHdoaWNoIGlzIGl0c2VsZiBhIHBpbm5lZCBhbGlhcyBvZiByZWFjdC1pbnRsQDUuMTgrKS5cclxuICAgICAgXCJyZWFjdC1pbnRsXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvQGF0bGFza2l0L3JlbmRlcmVyL25vZGVfbW9kdWxlcy9yZWFjdC1pbnRsLW5leHQvaW5kZXguanNcIiksXHJcbiAgICAgIC8vIE91ciBvd24gY29kZSBpbXBvcnRzIGByZWFjdC1pbnRsLW5leHRgIGRpcmVjdGx5IChBdGxhc2tpdCBjb252ZW50aW9uKS5cclxuICAgICAgLy8gUGluIGl0IHRvIHRoZSBuZXN0ZWQgY29weSBzaGlwcGVkIHdpdGggQGF0bGFza2l0L3JlbmRlcmVyIFx1MjAxNCBndWFyYW50ZWVkIHRvXHJcbiAgICAgIC8vIGV4aXN0IHNpbmNlIHdlIGRlcGVuZCBvbiBAYXRsYXNraXQvcmVuZGVyZXIuIFRoZSBob2lzdGVkIHRvcC1sZXZlbCBjb3B5XHJcbiAgICAgIC8vIGlzIG5vdCByZWxpYWJsZSBhY3Jvc3MgaW5zdGFsbCBlbnZpcm9ubWVudHMgKG9ubHkgcHJlc2VudCB3aGVuIGhvaXN0ZWQpLlxyXG4gICAgICBcInJlYWN0LWludGwtbmV4dFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9yZW5kZXJlci9ub2RlX21vZHVsZXMvcmVhY3QtaW50bC1uZXh0L2luZGV4LmpzXCIpLFxyXG4gICAgICAvLyBAYXRsYXNraXQvZWRpdG9yLXBsdWdpbnMgbGF5b3V0IHZhcmllcyBieSBucG0gdmVyc2lvbjogb2xkZXIgbnBtIGxlYXZlc1xyXG4gICAgICAvLyBpdCBuZXN0ZWQgdW5kZXIgZWRpdG9yLWNvcmUsIG5ld2VyIG5wbSBob2lzdHMgaXQgdG8gdGhlIHRvcCBsZXZlbCAoaXRcclxuICAgICAgLy8gaXMgYWxzbyBhIGRpcmVjdCBkZXAgKyBvdmVycmlkZSBhdCB2ZXJzaW9uIDEzLjAuMTIwKS4gUGljayB3aGljaGV2ZXJcclxuICAgICAgLy8gcGh5c2ljYWxseSBleGlzdHMgc28gdGhlIGRlZHVwZSBhbGlhcyByZXNvbHZlcyB0byBhIHNpbmdsZSBjYW5vbmljYWxcclxuICAgICAgLy8gcGF0aCBvbiBlaXRoZXIgbGF5b3V0LlxyXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcGx1Z2luc1wiOiAoKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IG5lc3RlZCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1jb3JlL25vZGVfbW9kdWxlcy9AYXRsYXNraXQvZWRpdG9yLXBsdWdpbnNcIik7XHJcbiAgICAgICAgY29uc3QgaG9pc3RlZCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1wbHVnaW5zXCIpO1xyXG4gICAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKG5lc3RlZCkgPyBuZXN0ZWQgOiBob2lzdGVkO1xyXG4gICAgICB9KSgpLFxyXG4gICAgICAvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgICAgLy8gQ1JJVElDQUw6IEZvcmNlIGEgU0lOR0xFIFByb3NlTWlycm9yIGluc3RhbmNlIHNoYXJlZCBieSBBdGxhc2tpdCArIFRpcHRhcC5cclxuICAgICAgLy9cclxuICAgICAgLy8gQXRsYXNraXQgKEBhdGxhc2tpdC9lZGl0b3ItY29yZSwgQGF0bGFza2l0L3JlbmRlcmVyKSBpbXBvcnRzIGl0c1xyXG4gICAgICAvLyBQcm9zZU1pcnJvciB2aWEgYEBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3IvPHN1YnBhdGg+YCAoYW4gaW50ZXJuYWxcclxuICAgICAgLy8gd3JhcHBlciB0aGF0IHJlLWV4cG9ydHMgcGlubmVkIHByb3NlbWlycm9yLSogcGFja2FnZXMpLiBUaXB0YXAgaW1wb3J0c1xyXG4gICAgICAvLyB2aWEgYEB0aXB0YXAvcG0vPHN1YnBhdGg+YCB3aGljaCBpdHNlbGYgZG9lcyBgZXhwb3J0ICogZnJvbSAncHJvc2VtaXJyb3ItKidgLlxyXG4gICAgICAvL1xyXG4gICAgICAvLyBJZiB0aGUgdHdvIHRyZWVzIHJlc29sdmUgdG8gRElGRkVSRU5UIHByb3NlbWlycm9yLSogY29waWVzLCBib3RoXHJcbiAgICAgIC8vIHJlZ2lzdGVyIHRoZSBzYW1lIHNlbGVjdGlvbiBKU09OIElEcyBpbnRvIGEgc2hhcmVkIHJlZ2lzdHJ5IFx1MjE5MlxyXG4gICAgICAvLyBSYW5nZUVycm9yOiBcIkR1cGxpY2F0ZSB1c2Ugb2Ygc2VsZWN0aW9uIEpTT04gSUQgY2VsbFwiLlxyXG4gICAgICAvL1xyXG4gICAgICAvLyBGaXg6IHJvdXRlIGV2ZXJ5IEF0bGFza2l0IGZvcmsgc3VicGF0aCB0byB0aGUgdXBzdHJlYW0gYHByb3NlbWlycm9yLSpgXHJcbiAgICAgIC8vIHBhY2thZ2UgYXQgdGhlIHRvcCBvZiBub2RlX21vZHVsZXMuIFRpcHRhcCdzIGBAdGlwdGFwL3BtLypgIGFscmVhZHlcclxuICAgICAgLy8gcmUtZXhwb3J0cyB0aG9zZSBleGFjdCBzYW1lIHVwc3RyZWFtIHBhY2thZ2VzICh0aGV5IGFyZSBkZWR1cGVkIHZpYVxyXG4gICAgICAvLyByZXNvbHZlLmRlZHVwZSBiZWxvdyksIHNvIGJvdGggZWRpdG9ycyBzaGFyZSBhIHNpbmdsZSBpbnN0YW5jZSBhbmRcclxuICAgICAgLy8gdGhlIGZ1bGwgQXRsYXNraXQgZWRpdG9yIGV4cGVyaWVuY2UgaXMgcHJlc2VydmVkIDE6MS5cclxuICAgICAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICAgIFwiQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvci9zdGF0ZVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3Byb3NlbWlycm9yLXN0YXRlXCIpLFxyXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3IvbW9kZWxcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9wcm9zZW1pcnJvci1tb2RlbFwiKSxcclxuICAgICAgXCJAYXRsYXNraXQvZWRpdG9yLXByb3NlbWlycm9yL3ZpZXdcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9wcm9zZW1pcnJvci12aWV3XCIpLFxyXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3IvdHJhbnNmb3JtXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItdHJhbnNmb3JtXCIpLFxyXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3Iva2V5bWFwXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3Ita2V5bWFwXCIpLFxyXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3IvaGlzdG9yeVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3Byb3NlbWlycm9yLWhpc3RvcnlcIiksXHJcbiAgICAgIFwiQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvci9kcm9wY3Vyc29yXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItZHJvcGN1cnNvclwiKSxcclxuICAgICAgXCJAYXRsYXNraXQvZWRpdG9yLXByb3NlbWlycm9yL2NvbW1hbmRzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItY29tbWFuZHNcIiksXHJcbiAgICAgIFwiQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvci91dGlsc1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3Byb3NlbWlycm9yLXV0aWxzXCIpLFxyXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3IvbWFya2Rvd25cIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9wcm9zZW1pcnJvci1tYXJrZG93blwiKSxcclxuICAgICAgLy8gQURTIG1pZ3JhdGlvbiAoUGhhc2UgMSwgMjAyNi0wNS0yNik6IHJlZGlyZWN0IGV2ZXJ5IGBpbXBvcnQgeyB0b2FzdCB9XHJcbiAgICAgIC8vIGZyb20gJ3Nvbm5lcidgICg2MjAgZmlsZXMpIHRvIHRoZSBBRFMgc2hpbSBhdCBAL2NvbXBvbmVudHMvdWkvc29ubmVyLlxyXG4gICAgICAvLyBUaGUgc2hpbSByb3V0ZXMgYWxsIHRvYXN0LiogY2FsbHMgdG8gQGF0bGFza2l0L2ZsYWcgKHNob3dGbGFnKS5cclxuICAgICAgLy8gWmVybyBjYWxsc2l0ZSBlZGl0cyByZXF1aXJlZCBcdTIwMTQgdGhlIGFsaWFzIGludGVyY2VwdHMgYXQgYnVuZGxlIHRpbWUuXHJcbiAgICAgIFwic29ubmVyXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvY29tcG9uZW50cy91aS9zb25uZXIudHN4XCIpLFxyXG4gICAgICAvLyBBRFMgbWlncmF0aW9uIChQaGFzZSA1LCAyMDI2LTA1LTI2KTogcmVkaXJlY3QgZXZlcnkgYGltcG9ydCB0b2FzdCBmcm9tXHJcbiAgICAgIC8vICdyZWFjdC1ob3QtdG9hc3QnYCAoMTIgZmlsZXMsIGRlZmF1bHQgaW1wb3J0KSB0byB0aGUgc2FtZSBBRFMgc2hpbS5cclxuICAgICAgLy8gc29ubmVyLnRzeCBleHBvcnRzIGBleHBvcnQgZGVmYXVsdCB0b2FzdGAgZm9yIHRoaXMgcGF0dGVybi5cclxuICAgICAgLy8gWmVybyBjYWxsc2l0ZSBlZGl0cyByZXF1aXJlZCBcdTIwMTQgdGhlIGFsaWFzIGludGVyY2VwdHMgYXQgYnVuZGxlIHRpbWUuXHJcbiAgICAgIFwicmVhY3QtaG90LXRvYXN0XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvY29tcG9uZW50cy91aS9zb25uZXIudHN4XCIpLFxyXG4gICAgfSxcclxuICAgIC8vIERlZHVwZSBwcm9zZW1pcnJvciBcdTIwMTQgYmVsdC1hbmQtc3VzcGVuZGVycyBhbG9uZ3NpZGUgdGhlIGFsaWFzIGFib3ZlLlxyXG4gICAgZGVkdXBlOiBbXHJcbiAgICAgICdyZWFjdCcsXHJcbiAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAncmVhY3QtaXMnLFxyXG4gICAgICAnQGF0bGFza2l0L2FkZi1zY2hlbWEnLFxyXG4gICAgICAnQGF0bGFza2l0L2VkaXRvci1wbHVnaW5zJyxcclxuICAgICAgJ0BhdGxhc2tpdC9lZGl0b3ItY29tbW9uJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLXN0YXRlJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLW1vZGVsJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLXZpZXcnLFxyXG4gICAgICAncHJvc2VtaXJyb3ItdHJhbnNmb3JtJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLXRhYmxlcycsXHJcbiAgICAgICdAYXRsYXNraXQvZWRpdG9yLXRhYmxlcycsXHJcbiAgICAgICdwcm9zZW1pcnJvci1rZXltYXAnLFxyXG4gICAgICAncHJvc2VtaXJyb3ItY29tbWFuZHMnLFxyXG4gICAgICAncHJvc2VtaXJyb3ItaGlzdG9yeScsXHJcbiAgICAgICdwcm9zZW1pcnJvci1pbnB1dHJ1bGVzJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLXNjaGVtYS1iYXNpYycsXHJcbiAgICAgICdwcm9zZW1pcnJvci1zY2hlbWEtbGlzdCcsXHJcbiAgICAgICdwcm9zZW1pcnJvci1kcm9wY3Vyc29yJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLWdhcGN1cnNvcicsXHJcbiAgICAgICdwcm9zZW1pcnJvci1tZW51JyxcclxuICAgICAgJ3Byb3NlbWlycm9yLXV0aWxzJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLWNoYW5nZXNldCcsXHJcbiAgICAgICdwcm9zZW1pcnJvci1jb2xsYWInLFxyXG4gICAgICAncHJvc2VtaXJyb3ItbWFya2Rvd24nLFxyXG4gICAgICAncHJvc2VtaXJyb3ItdHJhaWxpbmctbm9kZScsXHJcbiAgICBdLFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBpbmNsdWRlOiBbXHJcbiAgICAgICdyZWFjdCcsXHJcbiAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAncmVhY3QtaXMnLFxyXG4gICAgICAvLyBQcmUtYnVuZGxlIEBhdGxhc2tpdCBwcmltaXRpdmVzIHNvIFN1YnRhc2tzUGFuZWwgbW91bnQgZG9lc24ndCB0cmlnZ2VyXHJcbiAgICAgIC8vIG1pZC1mbGlnaHQgZGVwIHJlLW9wdGltaXphdGlvbiAod2hpY2ggNDA0cyBpbi1mbGlnaHQgY2h1bmsgcmVxdWVzdHMpLlxyXG4gICAgICAvLyBXaGVuIGFkb3B0aW5nIGEgbmV3IEF0bGFza2l0IGNvbXBvbmVudCBpbiBhIHN1cmZhY2UsIEFERCBJVCBIRVJFIHNvXHJcbiAgICAgIC8vIGZpcnN0IHJlbmRlciBpcyB3YXJtIGluc3RlYWQgb2Ygc3RhbGxpbmcgb24gY29sZCBvcHRpbWl6ZS5cclxuICAgICAgJ0BhdGxhc2tpdC9hdGxhc3NpYW4tbmF2aWdhdGlvbicsXHJcbiAgICAgICdAYXRsYXNraXQvYXRsYXNzaWFuLW5hdmlnYXRpb24vc2tlbGV0b24nLFxyXG4gICAgICAnQGF0bGFza2l0L25hdmlnYXRpb24tc3lzdGVtJyxcclxuICAgICAgJ0BhdGxhc2tpdC9sYXllcmluZycsXHJcbiAgICAgICdAYXRsYXNraXQvYXZhdGFyJyxcclxuICAgICAgJ0BhdGxhc2tpdC9hdmF0YXItZ3JvdXAnLFxyXG4gICAgICAnQGF0bGFza2l0L2JhZGdlJyxcclxuICAgICAgJ0BhdGxhc2tpdC9icmVhZGNydW1icycsXHJcbiAgICAgICdAYXRsYXNraXQvYnV0dG9uJyxcclxuICAgICAgJ0BhdGxhc2tpdC9jaGVja2JveCcsXHJcbiAgICAgICdAYXRsYXNraXQvZHJhd2VyJyxcclxuICAgICAgJ0BhdGxhc2tpdC9kcm9wZG93bi1tZW51JyxcclxuICAgICAgLy8gQGF0bGFza2l0L2R5bmFtaWMtdGFibGUgXHUyMDE0IGtlcHQgdW50aWwgUHJvZHVjdGlvbkluY2lkZW50c1dpZGdldCArXHJcbiAgICAgIC8vIFFBRGVmZWN0c1dpZGdldCBtaWdyYXRlIG9mZiBSZXNpemFibGVEeW5hbWljVGFibGUuIFN1YnRhc2tzUGFuZWwgK1xyXG4gICAgICAvLyBFcGljQmFja2xvZ1RhYmxlICsgYWRzL0R5bmFtaWNUYWJsZSBoYXZlIGFsbCBtb3ZlZCB0byBKaXJhVGFibGU7XHJcbiAgICAgIC8vIHRoZXNlIGRhc2hib2FyZCB3aWRnZXRzIGFyZSB0aGUgbGFzdCBjb25zdW1lcnMuXHJcbiAgICAgICdAYXRsYXNraXQvZHluYW1pYy10YWJsZScsXHJcbiAgICAgICdAYXRsYXNraXQvZW1wdHktc3RhdGUnLFxyXG4gICAgICAnQGF0bGFza2l0L2ZsYWcnLFxyXG4gICAgICAnQGF0bGFza2l0L2Zvcm0nLFxyXG4gICAgICAnQGF0bGFza2l0L2hlYWRpbmcnLFxyXG4gICAgICAnQGF0bGFza2l0L2ljb24nLFxyXG4gICAgICAnQGF0bGFza2l0L2lubGluZS1lZGl0JyxcclxuICAgICAgJ0BhdGxhc2tpdC9sb3plbmdlJyxcclxuICAgICAgJ0BhdGxhc2tpdC9saW5rJyxcclxuICAgICAgJ0BhdGxhc2tpdC9kYXRldGltZS1waWNrZXInLFxyXG4gICAgICAnQGF0bGFza2l0L3JhZGlvJyxcclxuICAgICAgJ0BhdGxhc2tpdC9wcm9ncmVzcy1iYXInLFxyXG4gICAgICAnQGF0bGFza2l0L3RhYnMnLFxyXG4gICAgICAnQGF0bGFza2l0L21lbnUnLFxyXG4gICAgICAnQGF0bGFza2l0L21vZGFsLWRpYWxvZycsXHJcbiAgICAgICdAYXRsYXNraXQvdXNlci1waWNrZXInLFxyXG4gICAgICAnQGF0bGFza2l0L3BhZ2UtbGF5b3V0JyxcclxuICAgICAgJ0BhdGxhc2tpdC9wb3B1cCcsXHJcbiAgICAgICdAYXRsYXNraXQvcHJhZ21hdGljLWRyYWctYW5kLWRyb3AnLFxyXG4gICAgICAnQGF0bGFza2l0L3ByYWdtYXRpYy1kcmFnLWFuZC1kcm9wLWF1dG8tc2Nyb2xsJyxcclxuICAgICAgJ0BhdGxhc2tpdC9wcmFnbWF0aWMtZHJhZy1hbmQtZHJvcC1mbG91cmlzaCcsXHJcbiAgICAgICdAYXRsYXNraXQvcHJhZ21hdGljLWRyYWctYW5kLWRyb3AtaGl0Ym94JyxcclxuICAgICAgJ0BhdGxhc2tpdC9wcmFnbWF0aWMtZHJhZy1hbmQtZHJvcC1yZWFjdC1kcm9wLWluZGljYXRvcicsXHJcbiAgICAgICdAYXRsYXNraXQvcHJpbWl0aXZlcycsXHJcbiAgICAgICdAYXRsYXNraXQvc2VjdGlvbi1tZXNzYWdlJyxcclxuICAgICAgJ0BhdGxhc2tpdC9zZWxlY3QnLFxyXG4gICAgICAnQGF0bGFza2l0L3NpZGUtbmF2aWdhdGlvbicsXHJcbiAgICAgICdAYXRsYXNraXQvc3Bpbm5lcicsXHJcbiAgICAgICdAYXRsYXNraXQvdGFnJyxcclxuICAgICAgJ0BhdGxhc2tpdC90ZXh0YXJlYScsXHJcbiAgICAgICdAYXRsYXNraXQvdGV4dGZpZWxkJyxcclxuICAgICAgJ0BhdGxhc2tpdC90b2tlbnMnLFxyXG4gICAgICAnQGF0bGFza2l0L3Rvb2x0aXAnLFxyXG4gICAgICAnQGF0bGFza2l0L3RvZ2dsZScsXHJcbiAgICAgICdyZWFjdC13aW5kb3cnLFxyXG4gICAgICAvLyBKaXJhVGFibGUgY2Fub25pY2FsIGFkb3B0ZWQgQHRhbnN0YWNrL3JlYWN0LXZpcnR1YWwgb24gMjAyNi0wNC0yNiBmb3JcclxuICAgICAgLy8gb3B0LWluIHJvdyB2aXJ0dWFsaXphdGlvbiAoZW5hYmxlVmlydHVhbGl6YXRpb24gcHJvcCkuIFByZS1idW5kbGluZ1xyXG4gICAgICAvLyBoZXJlIGF2b2lkcyB0aGUgb3B0aW1pemUtZGVwcyBjb2xkLXJlc3RhcnQgNTAwIHRoYXQgaGl0cyBkeW5hbWljXHJcbiAgICAgIC8vIGltcG9ydHMgb2YgQmFja2xvZ1BhZ2UgLyBTdWJ0YXNrc1BhbmVsIHJpZ2h0IGFmdGVyIHRoZSBkZXBlbmRlbmN5XHJcbiAgICAgIC8vIGZpcnN0IGFwcGVhcnMgaW4gdGhlIGltcG9ydCBncmFwaC5cclxuICAgICAgJ0B0YW5zdGFjay9yZWFjdC12aXJ0dWFsJyxcclxuICAgICAgLy8gRm9yY2UtcHJlLWJ1bmRsZSB0aGUgcG9wcGVyIGNoYWluIHB1bGxlZCBpbiB0cmFuc2l0aXZlbHkgYnlcclxuICAgICAgLy8gQGF0bGFza2l0L3NlbGVjdCArIEBhdGxhc2tpdC91c2VyLXBpY2tlci4gV2l0aG91dCBleHBsaWNpdCBlbnRyaWVzLFxyXG4gICAgICAvLyB2aXRlJ3MgaG90IHJlLW9wdGltaXplICh0cmlnZ2VyZWQgd2hlbiBhIG5ldyBAYXRsYXNraXQvKiBkZXAgbGFuZHNcclxuICAgICAgLy8gbWlkLXNlc3Npb24pIGNhbiBsZWF2ZSBlc2J1aWxkIHdpdGggYSBzdGFsZSBtYW5pZmVzdCBhbmQgZmFpbCB3aXRoXHJcbiAgICAgIC8vICAgXCJDb3VsZCBub3QgcmVzb2x2ZSAuL2RvbS11dGlscy9nZXRMYXlvdXRSZWN0LmpzXCIgaW4gQHBvcHBlcmpzL2NvcmVcclxuICAgICAgLy8gZXZlbiB0aG91Z2ggdGhlIGZpbGVzIGFyZSBvbiBkaXNrLiBMaXN0aW5nIHRoZW0gaGVyZSBwaW5zIHN0YWJsZVxyXG4gICAgICAvLyBwcmUtYnVuZGxlIElEcyBzbyB0aGUgbWFuaWZlc3Qgc3Vydml2ZXMgcmUtb3B0aW1pemF0aW9uLlxyXG4gICAgICAnQHBvcHBlcmpzL2NvcmUnLFxyXG4gICAgICAncmVhY3QtcG9wcGVyJyxcclxuICAgICAgLy8gbHVjaWRlLXJlYWN0IGV4cG9ydHMgMTAwMCsgbmFtZWQgaWNvbiBleHBvcnRzIChBY3Rpdml0eSwgQWN0aXZpdHlJY29uLCBldGMpLlxyXG4gICAgICAvLyBXaXRob3V0IHByZS1idW5kbGluZywgZXNidWlsZCBvbi1kZW1hbmQgb3B0aW1pemF0aW9uIGNhbiBsb3NlIGV4cG9ydHMgdW5kZXIgSE1SLFxyXG4gICAgICAvLyBjYXVzaW5nIFJlZmVyZW5jZUVycm9yOiBcIkFjdGl2aXR5IGlzIG5vdCBkZWZpbmVkXCIgYXQgcnVudGltZS4gRWFnZXIgcHJlLWJ1bmRsaW5nXHJcbiAgICAgIC8vIGd1YXJhbnRlZXMgYWxsIGV4cG9ydHMgYXJlIGF2YWlsYWJsZSB3aGVuIHRoZSBtb2R1bGUgZmlyc3QgbG9hZHMuXHJcbiAgICAgICdsdWNpZGUtcmVhY3QnLFxyXG4gICAgICAvLyBOT1RFOiBAYXRsYXNraXQvZWRpdG9yLWNvcmUgYW5kIEBhdGxhc2tpdC9yZW5kZXJlciBhcmUgaW50ZW50aW9uYWxseVxyXG4gICAgICAvLyBFWENMVURFRCBoZXJlLiBUaGV5IGJ1bmRsZSB0aGVpciBvd24gUHJvc2VNaXJyb3IgdHJlZSBhbmQgY2xhc2ggd2l0aFxyXG4gICAgICAvLyBUaXB0YXAgaWYgZWFnZXJseSBsb2FkZWQuIEF0bGFza2l0RWRpdG9yLnRzeCBsYXp5LWltcG9ydHMgZWRpdG9yLWNvcmVcclxuICAgICAgLy8gdmlhIFJlYWN0Lmxhenkgc28gaXQgb25seSBlbnRlcnMgdGhlIHBhZ2Ugd2hlbiBhbiBlZGl0b3IgaXMgbW91bnRlZC5cclxuICAgICAgLy8gUHJlLWJ1bmRsZSBwcm9zZW1pcnJvciBzbyBlZGl0b3ItY29yZSArIHJlbmRlcmVyIHNoYXJlIE9ORSBpbnN0YW5jZS5cclxuICAgICAgJ3Byb3NlbWlycm9yLXN0YXRlJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLW1vZGVsJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLXZpZXcnLFxyXG4gICAgICAncHJvc2VtaXJyb3ItdHJhbnNmb3JtJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLXRhYmxlcycsXHJcbiAgICAgICdwcm9zZW1pcnJvci1rZXltYXAnLFxyXG4gICAgICAncHJvc2VtaXJyb3ItY29tbWFuZHMnLFxyXG4gICAgICAncHJvc2VtaXJyb3ItaGlzdG9yeScsXHJcbiAgICAgICdwcm9zZW1pcnJvci1zY2hlbWEtbGlzdCcsXHJcbiAgICAgICdwcm9zZW1pcnJvci1kcm9wY3Vyc29yJyxcclxuICAgICAgJ3Byb3NlbWlycm9yLWdhcGN1cnNvcicsXHJcbiAgICAgICdwcm9zZW1pcnJvci11dGlscycsXHJcbiAgICBdLFxyXG4gICAgLy8gTWlycm9yIHRoZSBWaXRlIGFkZlNjaGVtYVN0YWdlUGF0Y2hlciBmb3IgZXNidWlsZCdzIHByZS1idW5kbGluZyBwYXNzLlxyXG4gICAgLy8gZXNidWlsZCBydW5zIGJlZm9yZSBWaXRlIHBsdWdpbnMsIHNvIHRoZSBSb2xsdXAgbG9hZC1ob29rIHBhdGNoZXIgY2FuJ3RcclxuICAgIC8vIGludGVyY2VwdCBAYXRsYXNraXQvYWRmLXNjaGVtYSBkdXJpbmcgZGVwIG9wdGltaXphdGlvbi4gV2l0aG91dCB0aGlzLFxyXG4gICAgLy8gZWRpdG9yLXBsdWdpbi1saXN0ICsgZWRpdG9yLXBsdWdpbi10YXNrcy1hbmQtZGVjaXNpb25zIGZhaWwgdG8gcmVzb2x2ZVxyXG4gICAgLy8gbGlzdEl0ZW1XaXRoRmxleGlibGVGaXJzdENoaWxkU3RhZ2UwIC8gdGFza0xpc3RXaXRoRmxleGlibGVGaXJzdENoaWxkU3RhZ2UwLlxyXG4gICAgZXNidWlsZE9wdGlvbnM6IHtcclxuICAgICAgcGx1Z2luczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdhZGYtc2NoZW1hLXN0YWdlMC1wYXRjaGVyLWVzYnVpbGQnLFxyXG4gICAgICAgICAgc2V0dXAoYnVpbGQ6IGFueSkge1xyXG4gICAgICAgICAgICBidWlsZC5vbkxvYWQoXHJcbiAgICAgICAgICAgICAgeyBmaWx0ZXI6IC9hZGYtc2NoZW1hWy9cXFxcXWRpc3RbL1xcXFxdZXNtWy9cXFxcXWluZGV4XFwuanMkLyB9LFxyXG4gICAgICAgICAgICAgIChhcmdzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhcmdzLnBhdGgpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsID0gZnMucmVhZEZpbGVTeW5jKGFyZ3MucGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICBjb250ZW50czpcclxuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbCArXHJcbiAgICAgICAgICAgICAgICAgICAgJ1xcbmV4cG9ydCBjb25zdCBsaXN0SXRlbVdpdGhGbGV4aWJsZUZpcnN0Q2hpbGRTdGFnZTAgPSB1bmRlZmluZWQ7XFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2V4cG9ydCBjb25zdCB0YXNrTGlzdFdpdGhGbGV4aWJsZUZpcnN0Q2hpbGRTdGFnZTAgPSB1bmRlZmluZWQ7XFxuJyxcclxuICAgICAgICAgICAgICAgICAgbG9hZGVyOiAnanMnLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIC8vIE1pcnJvciBvZiBwcm9zZW1pcnJvckdhcGN1cnNvcklkZW1wb3RlbnQgZm9yIHRoZSBlc2J1aWxkXHJcbiAgICAgICAgICAvLyBkZXAtYnVuZGxpbmcgcGFzcy4gVGhlIFZpdGUgdHJhbnNmb3JtIHBsdWdpbiBydW5zIGFmdGVyXHJcbiAgICAgICAgICAvLyBwcmUtYnVuZGxpbmcsIHNvIGZvciBwYWNrYWdlcyBpbiBvcHRpbWl6ZURlcHMuaW5jbHVkZVxyXG4gICAgICAgICAgLy8gKHByb3NlbWlycm9yLWdhcGN1cnNvciBJUykgdGhlIHBhdGNoIG11c3QgYWxzbyBiZSBhcHBsaWVkIGhlcmVcclxuICAgICAgICAgIC8vIG9yIHRoZSBwcmUtYnVuZGxlZCBjaHVuayBzaGlwcyB0aGUgdW5wYXRjaGVkIHRvcC1sZXZlbFxyXG4gICAgICAgICAgLy8gU2VsZWN0aW9uLmpzb25JRCBjYWxsIGFuZCBITVIgcmUtZXZhbCBzdGlsbCB0aHJvd3MuXHJcbiAgICAgICAgICBuYW1lOiAncHJvc2VtaXJyb3ItZ2FwY3Vyc29yLWlkZW1wb3RlbnQtZXNidWlsZCcsXHJcbiAgICAgICAgICBzZXR1cChidWlsZDogYW55KSB7XHJcbiAgICAgICAgICAgIGJ1aWxkLm9uTG9hZChcclxuICAgICAgICAgICAgICB7IGZpbHRlcjogL3Byb3NlbWlycm9yLWdhcGN1cnNvclsvXFxcXF1kaXN0Wy9cXFxcXWluZGV4XFwuKGM/anN8bWpzKSQvIH0sXHJcbiAgICAgICAgICAgICAgKGFyZ3M6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFyZ3MucGF0aCkpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWwgPSBmcy5yZWFkRmlsZVN5bmMoYXJncy5wYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGNoZWQgPSBvcmlnaW5hbC5yZXBsYWNlKFxyXG4gICAgICAgICAgICAgICAgICAvXihcXHMqKSgoPzpbXFx3Ll0rXFwuKT9TZWxlY3Rpb25cXC5qc29uSURcXHMqXFwoXFxzKlsnXCJdZ2FwY3Vyc29yWydcIl1cXHMqLFxccypHYXBDdXJzb3JcXHMqXFwpKVxccyo7P1xccyokL20sXHJcbiAgICAgICAgICAgICAgICAgICckMXRyeSB7ICQyOyB9IGNhdGNoIChfKSB7IC8qIGdhcGN1cnNvciBhbHJlYWR5IHJlZ2lzdGVyZWQgXHUyMDE0IHNlY29uZCBldmFsIChITVIgLyBkdWFsLXJlc29sdmUpIGlzIGEgbm8tb3AgKi8gfScsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgY29udGVudHM6IHBhdGNoZWQsIGxvYWRlcjogJ2pzJyB9O1xyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgLy8gTWlycm9yIG9mIHByb3NlbWlycm9yVGFibGVzSWRlbXBvdGVudCBmb3IgdGhlIGVzYnVpbGRcclxuICAgICAgICAgIC8vIGRlcC1idW5kbGluZyBwYXNzLiBwcm9zZW1pcnJvci10YWJsZXMgSVMgaW4gb3B0aW1pemVEZXBzLmluY2x1ZGVcclxuICAgICAgICAgIC8vIGFuZCByZWdpc3RlcnMgU2VsZWN0aW9uLmpzb25JRChcImNlbGxcIiwgQ2VsbFNlbGVjdGlvbikgYXQgbW9kdWxlXHJcbiAgICAgICAgICAvLyBsb2FkIFx1MjAxNCBwYXRjaGluZyBib3RoIHBhc3NlcyBtYWtlcyB0aGUgcmVnaXN0cmF0aW9uIGlkZW1wb3RlbnRcclxuICAgICAgICAgIC8vIHJlZ2FyZGxlc3Mgb2Ygd2hpY2ggbG9hZGVyIHBhdGggcnVucyBmaXJzdC5cclxuICAgICAgICAgIG5hbWU6ICdwcm9zZW1pcnJvci10YWJsZXMtaWRlbXBvdGVudC1lc2J1aWxkJyxcclxuICAgICAgICAgIHNldHVwKGJ1aWxkOiBhbnkpIHtcclxuICAgICAgICAgICAgYnVpbGQub25Mb2FkKFxyXG4gICAgICAgICAgICAgIHsgZmlsdGVyOiAvcHJvc2VtaXJyb3ItdGFibGVzWy9cXFxcXWRpc3RbL1xcXFxdaW5kZXhcXC4oYz9qc3xtanMpJC8gfSxcclxuICAgICAgICAgICAgICAoYXJnczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYXJncy5wYXRoKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbCA9IGZzLnJlYWRGaWxlU3luYyhhcmdzLnBhdGgsICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0Y2hlZCA9IG9yaWdpbmFsLnJlcGxhY2UoXHJcbiAgICAgICAgICAgICAgICAgIC9eKFxccyopKCg/OltcXHcuXStcXC4pP1NlbGVjdGlvblxcLmpzb25JRFxccypcXChcXHMqWydcIl1jZWxsWydcIl1cXHMqLFxccypDZWxsU2VsZWN0aW9uXFxzKlxcKSlcXHMqOz9cXHMqJC9tLFxyXG4gICAgICAgICAgICAgICAgICAnJDF0cnkgeyAkMjsgfSBjYXRjaCAoXykgeyAvKiBjZWxsIHNlbGVjdGlvbiBhbHJlYWR5IHJlZ2lzdGVyZWQgXHUyMDE0IHNlY29uZCBldmFsIGlzIGEgbm8tb3AgKi8gfScsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgY29udGVudHM6IHBhdGNoZWQsIGxvYWRlcjogJ2pzJyB9O1xyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgLy8gUm9vdC1jYXVzZSBmaXggYXQgdGhlIHByb3NlbWlycm9yLXN0YXRlIGxldmVsIFx1MjAxNCBwYXRjaGVzXHJcbiAgICAgICAgICAvLyBTZWxlY3Rpb24uanNvbklEIHRvIGJlIGlkZW1wb3RlbnQuIENvdmVycyBldmVyeSBjdXJyZW50IGFuZFxyXG4gICAgICAgICAgLy8gZnV0dXJlIGR1cGxpY2F0ZS1zZWxlY3Rpb24tSUQgZXJyb3IsIG5vdCBqdXN0IGdhcGN1cnNvciAvIGNlbGwuXHJcbiAgICAgICAgICAvLyBNdXN0IGJlIGFwcGxpZWQgYXQgdGhlIGVzYnVpbGQgcGFzcyB0b28gYmVjYXVzZVxyXG4gICAgICAgICAgLy8gcHJvc2VtaXJyb3Itc3RhdGUgaXMgaW4gb3B0aW1pemVEZXBzLmluY2x1ZGUgYW5kIGdldHNcclxuICAgICAgICAgIC8vIHByZS1idW5kbGVkIGJlZm9yZSB0aGUgVml0ZSBzZXJ2ZS10cmFuc2Zvcm0gcGx1Z2luIHJ1bnMuXHJcbiAgICAgICAgICBuYW1lOiAncHJvc2VtaXJyb3Itc3RhdGUtaWRlbXBvdGVudC1qc29uaWQtZXNidWlsZCcsXHJcbiAgICAgICAgICBzZXR1cChidWlsZDogYW55KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFBBVFRFUk4gPVxyXG4gICAgICAgICAgICAgIC9pZlxccypcXChcXHMqaWRcXHMraW5cXHMrY2xhc3Nlc0J5SWRcXHMqXFwpXFxzKlxcez9cXHMqdGhyb3dcXHMrbmV3XFxzK1JhbmdlRXJyb3JcXHMqXFwoXFxzKltcIiddRHVwbGljYXRlIHVzZSBvZiBzZWxlY3Rpb24gSlNPTiBJRCA/W1wiJ11cXHMqXFwrXFxzKmlkXFxzKlxcKVxccyo7P1xccypcXH0/LztcclxuICAgICAgICAgICAgY29uc3QgUkVQTEFDRU1FTlQgPVxyXG4gICAgICAgICAgICAgICdpZiAoaWQgaW4gY2xhc3Nlc0J5SWQpIHsgc2VsZWN0aW9uQ2xhc3MucHJvdG90eXBlLmpzb25JRCA9IGlkOyByZXR1cm4gY2xhc3Nlc0J5SWRbaWRdOyB9JztcclxuICAgICAgICAgICAgYnVpbGQub25Mb2FkKFxyXG4gICAgICAgICAgICAgIHsgZmlsdGVyOiAvcHJvc2VtaXJyb3Itc3RhdGVbL1xcXFxdZGlzdFsvXFxcXF1pbmRleFxcLihjP2pzfG1qcykkLyB9LFxyXG4gICAgICAgICAgICAgIChhcmdzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhcmdzLnBhdGgpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsID0gZnMucmVhZEZpbGVTeW5jKGFyZ3MucGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIVBBVFRFUk4udGVzdChvcmlnaW5hbCkpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgY29udGVudHM6IG9yaWdpbmFsLnJlcGxhY2UoUEFUVEVSTiwgUkVQTEFDRU1FTlQpLCBsb2FkZXI6ICdqcycgfTtcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxyXG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTIwMCxcclxuICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiBmYWxzZSxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICAvLyBTdGFibGUgdmVuZG9yIGNodW5rcyBmb3IgYmV0dGVyIGxvbmctdGVybSBjYWNoaW5nXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LWRvbS8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LXJvdXRlcicpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXJlYWN0JztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0ByYWRpeC11aS8nKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci11aSc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AdGFuc3RhY2svJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItcXVlcnknO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVjaGFydHMnKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2QzJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItY2hhcnRzJztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcclxuICAgICAgICAgIC8vIExBWUVSIDQgXHUyMDE0IEF0bGFza2l0IGNodW5rIHNwbGl0IGFsb25nIEF0bGFzc2lhbiBwYWNrYWdlIGJvdW5kYXJpZXMuXHJcbiAgICAgICAgICAvLyBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcclxuICAgICAgICAgIC8vIEJlZm9yZTogZXZlcnkgQGF0bGFza2l0LyosIGV2ZXJ5IEB0aXB0YXAvKiBhbmQgZXZlcnkgcHJvc2VtaXJyb3ItKlxyXG4gICAgICAgICAgLy8gcGFja2FnZSB3YXMgZnVzZWQgaW50byBvbmUgfjRNQiBgdmVuZG9yLWVkaXRvcmAgY2h1bmsuIEFueSBmZWF0dXJlXHJcbiAgICAgICAgICAvLyB0aGF0IG1vdW50ZWQgYW4gQXRsYXNraXQgcHJpbWl0aXZlIChMb3plbmdlLCBBdmF0YXIsIER5bmFtaWNUYWJsZSlcclxuICAgICAgICAgIC8vIHBhaWQgdGhlIGZ1bGwgZWRpdG9yLWNvcmUgKyByZW5kZXJlciArIGVkaXRvci1wbHVnaW4tKiBjb3N0IHVwXHJcbiAgICAgICAgICAvLyBmcm9udCBcdTIwMTQgdGhhdCdzIHdoYXQgbWFkZSBCQVUtNDc3MSdzIEVwaWMgdmlldyBzbG93IHRvIG9wZW4uXHJcbiAgICAgICAgICAvL1xyXG4gICAgICAgICAgLy8gQWZ0ZXI6IGNodW5rcyBtYXRjaCBBdGxhc3NpYW4ncyBvd24gcGFja2FnZSBib3VuZGFyaWVzIHNvIGVhY2hcclxuICAgICAgICAgIC8vIHN1cmZhY2Ugb25seSBkb3dubG9hZHMgd2hhdCBpdCByZW5kZXJzLiBgaWZgIE9SREVSIElTIExPQUQtQkVBUklOR1xyXG4gICAgICAgICAgLy8gXHUyMDE0IGVkaXRvci1wbHVnaW4tKiBhbmQgZWRpdG9yLSogbXVzdCBiZSBtYXRjaGVkIEJFRk9SRSB0aGUgZ2VuZXJpY1xyXG4gICAgICAgICAgLy8gYEBhdGxhc2tpdC9gIGNhdGNoLWFsbCwgb3IgcGx1Z2lucyBsZWFrIGludG8gdGhlIHVpIGNodW5rLlxyXG4gICAgICAgICAgLy9cclxuICAgICAgICAgIC8vICAgdmVuZG9yLXByb3NlbWlycm9yICAgICAgUHJvc2VNaXJyb3IgY29yZSAoc2hhcmVkIGJ5IGVkaXRvciArXHJcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlcmVyICsgdGlwdGFwOyBkZWR1cGVkIHZpYVxyXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBgcmVzb2x2ZS5kZWR1cGVgIGFib3ZlKS4gTXVzdCBiZSBhXHJcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWJsZSBzaW5nbGV0b24gb3IgUE0gdGhyb3dzXHJcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiRHVwbGljYXRlIHVzZSBvZiBzZWxlY3Rpb24gSlNPTiBJRFwiLlxyXG4gICAgICAgICAgLy8gICB2ZW5kb3ItYXRsYXNraXQtZWRpdG9yICBlZGl0b3ItY29yZSArIGFsbCBlZGl0b3ItcGx1Z2luLSogK1xyXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0b3ItY29tbW9uICsgZWRpdG9yLWpzb24tdHJhbnNmb3JtZXIuXHJcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIE9ubHkgbG9hZGVkIHdoZW4gdGhlIHVzZXIgY2xpY2tzIEVkaXRcclxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgb24gYW4gRXBpYyBkZXNjcmlwdGlvbi4gfjJNQi5cclxuICAgICAgICAgIC8vICAgdmVuZG9yLWF0bGFza2l0LXJlbmRlcmVyICBAYXRsYXNraXQvcmVuZGVyZXIuIExvYWRlZCBvbiBFcGljXHJcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuIH40MDBcdTIwMTM2MDBLQi5cclxuICAgICAgICAgIC8vICAgdmVuZG9yLWF0bGFza2l0LWFkZiAgICAgQGF0bGFza2l0L2FkZi0qIHV0aWxpdGllcy4gVGlueSxcclxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hhcmVkIGJ5IGVkaXRvciArIHJlbmRlcmVyICsgdGhlXHJcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW4tYnVuZGxlIGBhZGZUb1BsYWluVGV4dGAuXHJcbiAgICAgICAgICAvLyAgIHZlbmRvci1hdGxhc2tpdC1tZWRpYSAgIEBhdGxhc2tpdC9tZWRpYS0qIChleHRlcm5hbCBtZWRpYVxyXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBzdXBwb3J0KS4gTG9hZGVkIGFsb25nc2lkZSByZW5kZXJlci5cclxuICAgICAgICAgIC8vICAgdmVuZG9yLWF0bGFza2l0LXVpICAgICAgcHJpbWl0aXZlcyB1c2VkIGJ5IFN1YnRhc2tzUGFuZWwgL1xyXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBMaW5rZWRXb3JrSXRlbXM6IGF2YXRhciwgbG96ZW5nZSxcclxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJvcGRvd24tbWVudSwgcG9wdXAsIHNlbGVjdCxcclxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dGZpZWxkLCB0b2tlbnMsIGljb24sIGJ1dHRvbixcclxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tib3gsIHByaW1pdGl2ZXMsIHByb2dyZXNzLWJhci5cclxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2FjaGVkIG9uY2UsIHJldXNlZCBvbiBldmVyeSBmZWF0dXJlLlxyXG4gICAgICAgICAgLy8gICB2ZW5kb3ItdGlwdGFwICAgICAgICAgICB0aXB0YXAgZWRpdG9yIChsZWdhY3kgbm9uLUVwaWMgcGF0aCkuXHJcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIElzb2xhdGVkIGZyb20gQXRsYXNraXQgc28gY2hhbmdlcyB0b1xyXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBvbmUgZG9uJ3QgYnVzdCB0aGUgb3RoZXIncyBjYWNoZS5cclxuICAgICAgICAgIC8vIFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFx1MjU1MFxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItcHJvc2VtaXJyb3InO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItY29yZScpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1jb21tb24nKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItcGx1Z2luLScpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1qc29uLXRyYW5zZm9ybWVyJykgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvZWRpdG9yLW1hcmtkb3duLXRyYW5zZm9ybWVyJykgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvZWRpdG9yLXBhbGV0dGUnKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItcGVyZm9ybWFuY2UtbWV0cmljcycpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvcicpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci10YWJsZXMnKVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWF0bGFza2l0LWVkaXRvcic7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvcmVuZGVyZXInKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1hdGxhc2tpdC1yZW5kZXJlcic7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvYWRmLScpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWF0bGFza2l0LWFkZic7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvbWVkaWEtJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItYXRsYXNraXQtbWVkaWEnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEBhdGxhc2tpdC8qIHNwbGl0IHBlciByb2xlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgICAgICAgLy8gVGhlIGNhdGNoLWFsbCBgdmVuZG9yLWF0bGFza2l0LXVpYCBjaHVuayBwcmV2aW91c2x5IGFic29yYmVkXHJcbiAgICAgICAgICAvLyBldmVyeSBub24tZWRpdG9yIEF0bGFza2l0IHBhY2thZ2UgYW5kIGJhbGxvb25lZCB0byB+OC40TUIuIE1vc3RcclxuICAgICAgICAgIC8vIHN1cmZhY2VzIHVzZSBvbmx5IGEgaGFuZGZ1bCBvZiB0aGVzZS4gU3BsaXR0aW5nIGFsb25nIHVzYWdlXHJcbiAgICAgICAgICAvLyBib3VuZGFyaWVzIChkcmFnL2Ryb3AsIG1lbnRpb24vZW1vamkvc21hcnQtY2FyZCwgdXNlci1waWNrZXJcclxuICAgICAgICAgIC8vIGFuZCBmb3JtIGhlYXZpZXMsIGJhc2UgcHJpbWl0aXZlcykga2VlcHMgdGhlIHVuaXZlcnNhbGx5LXNoYXJlZFxyXG4gICAgICAgICAgLy8gcHJpbWl0aXZlcyBjaHVuayBzbWFsbCBhbmQgcHVzaGVzIGZlYXR1cmUtc3BlY2lmaWMgd2VpZ2h0IHRvXHJcbiAgICAgICAgICAvLyBjaHVua3MgdGhhdCBsb2FkIG9uIGRlbWFuZC5cclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9wcmFnbWF0aWMtZHJhZy1hbmQtZHJvcCcpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWF0bGFza2l0LWRuZCc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L21lbnRpb24nKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lbW9qaScpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L3NtYXJ0LWNhcmQnKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9wcm9maWxlY2FyZCcpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L3Rhc2stZGVjaXNpb24nKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9zdGF0dXMnKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9kYXRlJylcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1hdGxhc2tpdC1yaWNoJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvdXNlci1waWNrZXInKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9mb3JtJykgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvZHluYW1pYy10YWJsZScpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2lubGluZS1lZGl0JykgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvbW9kYWwtZGlhbG9nJykgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvY2FsZW5kYXInKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9kYXRldGltZS1waWNrZXInKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9wYWdlLWxheW91dCcpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2F0bGFzc2lhbi1uYXZpZ2F0aW9uJykgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvbWVudScpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2Ryb3Bkb3duLW1lbnUnKVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWF0bGFza2l0LWZvcm1zJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC8nKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1hdGxhc2tpdC11aSc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBAdGlwdGFwLyogaW50ZW50aW9uYWxseSBub3Qgc3BsaXQgXHUyMDE0IGl0J3Mgb25seSByZWFjaGVkIHZpYSB0aGVcclxuICAgICAgICAgIC8vIChsYXp5KSBDb25mbHVlbmNlRWRpdG9yIHBhdGg7IGluIGxlYW4gYnVpbGRzIGl0J3Mgc3R1YmJlZCBvdXRcclxuICAgICAgICAgIC8vIGVudGlyZWx5LCBhbmQgaW4gZnVsbCBidWlsZHMgaXQgY28tbG9jYXRlcyBmaW5lIHdpdGggd2hpY2hldmVyXHJcbiAgICAgICAgICAvLyByb3V0ZSBpbXBvcnRzIGl0LiBBIGRlZGljYXRlZCBjaHVuayB3b3VsZCBmYWlsIHRoZSBTVyBkcmlmdFxyXG4gICAgICAgICAgLy8gdmVyaWZ5IGluIGxlYW4gYnVpbGRzIChjaHVuayBkZWNsYXJlZCBidXQgbmV2ZXIgcHJvZHVjZWQpLlxyXG5cclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2ZyYW1lci1tb3Rpb24nKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1tb3Rpb24nO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEV4cG9ydCBsaWJyYXJpZXM6IHNwbGl0IHBlci10b29sIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgICAgICAgLy8gUHJldmlvdXNseSBmdXNlZCBpbnRvIG9uZSB+Mi40TUIgYHZlbmRvci1leHBvcnRgIGNodW5rIHRoYXQgYW55XHJcbiAgICAgICAgICAvLyBzaW5nbGUgZXhwb3J0IGFjdGlvbiAoQ1NWIGRvd25sb2FkLCBQREYgcmVuZGVyLCBQUFRYIGV4cG9ydClcclxuICAgICAgICAgIC8vIHdvdWxkIHBheSBpbiBmdWxsLiBUaGV5IGFyZSBhbGwgZHluYW1pYy1pbXBvcnRlZCBvbiBkZW1hbmRcclxuICAgICAgICAgIC8vIChzZWUgc3JjL2xpYi9leHBvcnRMb2FkZXJzLnRzIGFuZCBmcmllbmRzKSBcdTIwMTQgc3BsaXR0aW5nIHBlclxyXG4gICAgICAgICAgLy8gcGFja2FnZSBtZWFucyBhIENTViBleHBvcnQgcHVsbHMgfjMwS0Igb2YgcGFwYXBhcnNlIGluc3RlYWRcclxuICAgICAgICAgIC8vIG9mIDIuNE1CIG9mIHVucmVsYXRlZCB0b29saW5nLlxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZXhjZWxqcycpKSByZXR1cm4gJ3ZlbmRvci1leHBvcnQtZXhjZWxqcyc7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy94bHN4JykpIHJldHVybiAndmVuZG9yLWV4cG9ydC14bHN4JztcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2pzcGRmLWF1dG90YWJsZScpKSByZXR1cm4gJ3ZlbmRvci1leHBvcnQtanNwZGYnO1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvanNwZGYnKSkgcmV0dXJuICd2ZW5kb3ItZXhwb3J0LWpzcGRmJztcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3BwdHhnZW5qcycpKSByZXR1cm4gJ3ZlbmRvci1leHBvcnQtcHB0eCc7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9qc3ppcCcpKSByZXR1cm4gJ3ZlbmRvci1leHBvcnQtanN6aXAnO1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvaHRtbDJjYW52YXMnKSkgcmV0dXJuICd2ZW5kb3ItZXhwb3J0LWh0bWwyY2FudmFzJztcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3BhcGFwYXJzZScpKSByZXR1cm4gJ3ZlbmRvci1leHBvcnQtcGFwYXBhcnNlJztcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2ZpbGUtc2F2ZXInKSkgcmV0dXJuICd2ZW5kb3ItZXhwb3J0LWZpbGVzYXZlcic7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9sdWNpZGUtcmVhY3QnKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1pY29ucyc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9kYXRlLWZucycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWRhdGUnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvem9kJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1ob29rLWZvcm0nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0Bob29rZm9ybS8nKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1mb3Jtcyc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9Ac3VwYWJhc2UvJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3Itc3VwYWJhc2UnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThVLFNBQVMsb0JBQTRCO0FBQ25YLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxRQUFRO0FBQ2YsU0FBUyxpQkFBaUI7QUFDMUIsU0FBUyx1QkFBdUI7QUFMaEMsSUFBTSxtQ0FBbUM7QUFzQnpDLElBQUk7QUFDRixZQUFVLFFBQVEsQ0FBQyxLQUFLLFFBQVEsa0NBQVcsc0JBQXNCLENBQUMsR0FBRztBQUFBLElBQ25FLE9BQU87QUFBQSxJQUNQLEtBQUs7QUFBQSxFQUNQLENBQUM7QUFDSCxRQUFRO0FBR1I7QUFhQSxTQUFTLGlCQUF5QjtBQUNoQyxRQUFNLGNBQWMsQ0FBQyxnQkFBZ0IsWUFBWSxhQUFh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QVcsZ0NBQWdDO0FBQUEsTUFDN0U7QUFBQTtBQUFBLE1BRUEsUUFBUTtBQUFBLFFBQ047QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGNBQWM7QUFBQSxNQUNaLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBS0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFLQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQTtBQUFB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
