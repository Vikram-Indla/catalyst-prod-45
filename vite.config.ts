import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
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
  },
  plugins: [
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
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react-is": path.resolve(__dirname, "./node_modules/react-is"),
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
    },
    // Dedupe prosemirror — belt-and-suspenders alongside the alias above.
    dedupe: [
      'react',
      'react-dom',
      'react-is',
      'prosemirror-state',
      'prosemirror-model',
      'prosemirror-view',
      'prosemirror-transform',
      'prosemirror-tables',
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
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-is',
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
      '@atlaskit/drawer',
      '@atlaskit/dropdown-menu',
      '@atlaskit/dynamic-table',
      '@atlaskit/empty-state',
      '@atlaskit/flag',
      '@atlaskit/form',
      '@atlaskit/heading',
      '@atlaskit/icon',
      '@atlaskit/inline-edit',
      '@atlaskit/lozenge',
      '@atlaskit/menu',
      '@atlaskit/modal-dialog',
      '@atlaskit/user-picker',
      '@atlaskit/page-layout',
      '@atlaskit/popup',
      '@atlaskit/pragmatic-drag-and-drop',
      '@atlaskit/pragmatic-drag-and-drop-auto-scroll',
      '@atlaskit/pragmatic-drag-and-drop-flourish',
      '@atlaskit/pragmatic-drag-and-drop-hitbox',
      '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator',
      '@atlaskit/primitives',
      '@atlaskit/section-message',
      '@atlaskit/select',
      '@atlaskit/spinner',
      '@atlaskit/textfield',
      '@atlaskit/tokens',
      '@atlaskit/tooltip',
      // Force-pre-bundle the popper chain pulled in transitively by
      // @atlaskit/select + @atlaskit/user-picker. Without explicit entries,
      // vite's hot re-optimize (triggered when a new @atlaskit/* dep lands
      // mid-session) can leave esbuild with a stale manifest and fail with
      //   "Could not resolve ./dom-utils/getLayoutRect.js" in @popperjs/core
      // even though the files are on disk. Listing them here pins stable
      // pre-bundle IDs so the manifest survives re-optimization.
      '@popperjs/core',
      'react-popper',
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
      'prosemirror-inputrules',
      'prosemirror-schema-basic',
      'prosemirror-schema-list',
      'prosemirror-dropcursor',
      'prosemirror-gapcursor',
      'prosemirror-utils',
    ],
  },
  build: {
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    reportCompressedSize: false,
    rollupOptions: {
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
          // LAYER 4 — Atlaskit chunk split along Atlassian package boundaries.
          // ═══════════════════════════════════════════════════════════════
          // Before: every @atlaskit/*, every @tiptap/* and every prosemirror-*
          // package was fused into one ~4MB `vendor-editor` chunk. Any feature
          // that mounted an Atlaskit primitive (Lozenge, Avatar, DynamicTable)
          // paid the full editor-core + renderer + editor-plugin-* cost up
          // front — that's what made BAU-4771's Epic view slow to open.
          //
          // After: chunks match Atlassian's own package boundaries so each
          // surface only downloads what it renders. `if` ORDER IS LOAD-BEARING
          // — editor-plugin-* and editor-* must be matched BEFORE the generic
          // `@atlaskit/` catch-all, or plugins leak into the ui chunk.
          //
          //   vendor-prosemirror      ProseMirror core (shared by editor +
          //                           renderer + tiptap; deduped via
          //                           `resolve.dedupe` above). Must be a
          //                           stable singleton or PM throws
          //                           "Duplicate use of selection JSON ID".
          //   vendor-atlaskit-editor  editor-core + all editor-plugin-* +
          //                           editor-common + editor-json-transformer.
          //                           Only loaded when the user clicks Edit
          //                           on an Epic description. ~2MB.
          //   vendor-atlaskit-renderer  @atlaskit/renderer. Loaded on Epic
          //                           view. ~400–600KB.
          //   vendor-atlaskit-adf     @atlaskit/adf-* utilities. Tiny,
          //                           shared by editor + renderer + the
          //                           main-bundle `adfToPlainText`.
          //   vendor-atlaskit-media   @atlaskit/media-* (external media
          //                           support). Loaded alongside renderer.
          //   vendor-atlaskit-ui      primitives used by SubtasksPanel /
          //                           LinkedWorkItems: avatar, lozenge,
          //                           dropdown-menu, popup, select,
          //                           textfield, tokens, icon, button,
          //                           checkbox, primitives, progress-bar.
          //                           Cached once, reused on every feature.
          //   vendor-tiptap           tiptap editor (legacy non-Epic path).
          //                           Isolated from Atlaskit so changes to
          //                           one don't bust the other's cache.
          // ═══════════════════════════════════════════════════════════════
          if (id.includes('node_modules/prosemirror-')) {
            return 'vendor-prosemirror';
          }
          if (
            id.includes('node_modules/@atlaskit/editor-core') ||
            id.includes('node_modules/@atlaskit/editor-common') ||
            id.includes('node_modules/@atlaskit/editor-plugin-') ||
            id.includes('node_modules/@atlaskit/editor-json-transformer') ||
            id.includes('node_modules/@atlaskit/editor-markdown-transformer') ||
            id.includes('node_modules/@atlaskit/editor-palette') ||
            id.includes('node_modules/@atlaskit/editor-performance-metrics') ||
            id.includes('node_modules/@atlaskit/editor-prosemirror') ||
            id.includes('node_modules/@atlaskit/editor-tables')
          ) {
            return 'vendor-atlaskit-editor';
          }
          if (id.includes('node_modules/@atlaskit/renderer')) {
            return 'vendor-atlaskit-renderer';
          }
          if (id.includes('node_modules/@atlaskit/adf-')) {
            return 'vendor-atlaskit-adf';
          }
          if (id.includes('node_modules/@atlaskit/media-')) {
            return 'vendor-atlaskit-media';
          }
          // ─── @atlaskit/* split per role ──────────────────────────────────
          // The catch-all `vendor-atlaskit-ui` chunk previously absorbed
          // every non-editor Atlaskit package and ballooned to ~8.4MB. Most
          // surfaces use only a handful of these. Splitting along usage
          // boundaries (drag/drop, mention/emoji/smart-card, user-picker
          // and form heavies, base primitives) keeps the universally-shared
          // primitives chunk small and pushes feature-specific weight to
          // chunks that load on demand.
          if (id.includes('node_modules/@atlaskit/pragmatic-drag-and-drop')) {
            return 'vendor-atlaskit-dnd';
          }
          if (
            id.includes('node_modules/@atlaskit/mention') ||
            id.includes('node_modules/@atlaskit/emoji') ||
            id.includes('node_modules/@atlaskit/smart-card') ||
            id.includes('node_modules/@atlaskit/profilecard') ||
            id.includes('node_modules/@atlaskit/task-decision') ||
            id.includes('node_modules/@atlaskit/status') ||
            id.includes('node_modules/@atlaskit/date')
          ) {
            return 'vendor-atlaskit-rich';
          }
          if (
            id.includes('node_modules/@atlaskit/user-picker') ||
            id.includes('node_modules/@atlaskit/form') ||
            id.includes('node_modules/@atlaskit/dynamic-table') ||
            id.includes('node_modules/@atlaskit/inline-edit') ||
            id.includes('node_modules/@atlaskit/modal-dialog') ||
            id.includes('node_modules/@atlaskit/calendar') ||
            id.includes('node_modules/@atlaskit/datetime-picker') ||
            id.includes('node_modules/@atlaskit/page-layout') ||
            id.includes('node_modules/@atlaskit/atlassian-navigation') ||
            id.includes('node_modules/@atlaskit/menu') ||
            id.includes('node_modules/@atlaskit/dropdown-menu')
          ) {
            return 'vendor-atlaskit-forms';
          }
          if (id.includes('node_modules/@atlaskit/')) {
            return 'vendor-atlaskit-ui';
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
  },
};
});
