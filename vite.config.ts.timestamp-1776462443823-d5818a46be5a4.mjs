// vite.config.ts
import { defineConfig } from "file:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/node_modules/vite/dist/node/index.js";
import react from "file:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { spawnSync } from "node:child_process";
import { componentTagger } from "file:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/Users/vikramindla/Documents/GitHub/catalyst-prod-44";
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
      port: 8080
    },
    plugins: [
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
        "react": path.resolve(__vite_injected_original_dirname, "./node_modules/react"),
        "react-dom": path.resolve(__vite_injected_original_dirname, "./node_modules/react-dom"),
        "react-is": path.resolve(__vite_injected_original_dirname, "./node_modules/react-is"),
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
        "@atlaskit/editor-prosemirror/markdown": path.resolve(__vite_injected_original_dirname, "./node_modules/prosemirror-markdown")
      },
      // Dedupe prosemirror — belt-and-suspenders alongside the alias above.
      dedupe: [
        "react",
        "react-dom",
        "react-is",
        "prosemirror-state",
        "prosemirror-model",
        "prosemirror-view",
        "prosemirror-transform",
        "prosemirror-tables",
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
        "@atlaskit/avatar",
        "@atlaskit/breadcrumbs",
        "@atlaskit/dropdown-menu",
        "@atlaskit/dynamic-table",
        "@atlaskit/lozenge",
        "@atlaskit/popup",
        "@atlaskit/primitives",
        "@atlaskit/textfield",
        "@atlaskit/tokens",
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
        "prosemirror-inputrules",
        "prosemirror-schema-basic",
        "prosemirror-schema-list",
        "prosemirror-dropcursor",
        "prosemirror-gapcursor",
        "prosemirror-utils"
      ]
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
            if (id.includes("node_modules/@atlaskit/")) {
              return "vendor-atlaskit-ui";
            }
            if (id.includes("node_modules/@tiptap/")) {
              return "vendor-tiptap";
            }
            if (id.includes("node_modules/framer-motion")) {
              return "vendor-motion";
            }
            if (id.includes("node_modules/exceljs") || id.includes("node_modules/xlsx") || id.includes("node_modules/jspdf") || id.includes("node_modules/pptxgenjs") || id.includes("node_modules/jszip") || id.includes("node_modules/html2canvas") || id.includes("node_modules/file-saver") || id.includes("node_modules/papaparse")) {
              return "vendor-export";
            }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdmlrcmFtaW5kbGEvRG9jdW1lbnRzL0dpdEh1Yi9jYXRhbHlzdC1wcm9kLTQ0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvdmlrcmFtaW5kbGEvRG9jdW1lbnRzL0dpdEh1Yi9jYXRhbHlzdC1wcm9kLTQ0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy92aWtyYW1pbmRsYS9Eb2N1bWVudHMvR2l0SHViL2NhdGFseXN0LXByb2QtNDQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIFBsdWdpbiB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuXG4vKipcbiAqIEFVVE8tU1lOQyBERVBTIFx1MjAxNCBydW5zIGF0IHZpdGUgY29uZmlnIGxvYWQsIHJlZ2FyZGxlc3Mgb2YgbGF1bmNoZXIuXG4gKlxuICogV2l0aG91dCB0aGlzLCBhIHB1bGwgdGhhdCBhZGRzIGEgbmV3IEBhdGxhc2tpdC8qIHBhY2thZ2UgcHJvZHVjZXM6XG4gKiAgIFtwbHVnaW46dml0ZTppbXBvcnQtYW5hbHlzaXNdIEZhaWxlZCB0byByZXNvbHZlIGltcG9ydCBcIkBhdGxhc2tpdC88cGtnPlwiXG4gKiAuLi5iZWNhdXNlIG5vZGVfbW9kdWxlcyBoYXNuJ3QgYmVlbiB1cGRhdGVkLiBUaGF0IGhhcHBlbnMgd2hldGhlciB0aGVcbiAqIGRldiBzZXJ2ZXIgd2FzIHN0YXJ0ZWQgdmlhIGBidW4gcnVuIGRldmAsIGBucG0gcnVuIGRldmAsIGRpcmVjdCBgdml0ZWAsXG4gKiBgbnB4IHZpdGUgLS1ob3N0YCwgb3IgYW4gSURFIGxhdW5jaC5qc29uLiBSdW5uaW5nIHRoZSBzeW5jIGhlcmUgY2F0Y2hlc1xuICogYWxsIG9mIHRoZW0gXHUyMDE0IHZpdGUuY29uZmlnLnRzIGlzIHRoZSBzaW5nbGUgZW50cnkgZXZlcnkgbGF1bmNoIHBhdGhcbiAqIGV2ZW50dWFsbHkgZXhlY3V0ZXMuXG4gKlxuICogVGhlIHNjcmlwdCBpdHNlbGYgaXMgZmluZ2VycHJpbnQtY2FjaGVkLCBzbyBvbiB0aGUgaGFwcHkgcGF0aCB0aGlzXG4gKiBhZGRzIH4xMDBtcyB0byBjb2xkIHN0YXJ0IGFuZCAwbXMgdG8gSE1SLiBJdCBvbmx5IGluc3RhbGxzIHdoZW5cbiAqIHBhY2thZ2UuanNvbiAvIGxvY2tmaWxlcyBhY3R1YWxseSBjaGFuZ2VkIHNpbmNlIGxhc3QgcnVuLlxuICovXG50cnkge1xuICBzcGF3blN5bmMoXCJub2RlXCIsIFtwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcInNjcmlwdHMvc3luYy1kZXBzLmpzXCIpXSwge1xuICAgIHN0ZGlvOiBcImluaGVyaXRcIixcbiAgICBjd2Q6IF9fZGlybmFtZSxcbiAgfSk7XG59IGNhdGNoIHtcbiAgLy8gc3luYy1kZXBzIGlzIGJlc3QtZWZmb3J0IFx1MjAxNCBpZiBpdCBjYW4ndCBydW4sIHZpdGUncyBvd24gZXJyb3JzIHN1cmZhY2VcbiAgLy8gdGhlIHJlYWwgcHJvYmxlbSBtb3JlIGNsZWFybHkgdGhhbiBhbnl0aGluZyB3ZSdkIHByaW50IGhlcmUuXG59XG5cbi8qKlxuICogZGV2RGVwc1dhdGNoZXIgXHUyMDE0IFZpdGUgcGx1Z2luIHRoYXQgcmUtcnVucyBzeW5jLWRlcHMgd2hlbiBwYWNrYWdlLmpzb25cbiAqIG9yIGEgbG9ja2ZpbGUgY2hhbmdlcyBEVVJJTkcgYSBydW5uaW5nIGRldiBzZXNzaW9uLlxuICpcbiAqIFRoZSBjb25maWctbG9hZCBzeW5jIGFib3ZlIGNvdmVycyBmcmVzaCBzdGFydHMuIFRoaXMgcGx1Z2luIGhhbmRsZXMgdGhlXG4gKiBzY2VuYXJpbyB3aGVyZSB2aXRlIGlzIGFscmVhZHkgcnVubmluZywgdGhlIGRldmVsb3BlciBwdWxscyBhIGNvbW1pdFxuICogdGhhdCBhZGRzIGEgbmV3IEBhdGxhc2tpdC8qIGRlcCwgYW5kIEhNUiB0cmllcyB0byB0cmFuc2Zvcm0gYSBtb2R1bGVcbiAqIHRoYXQgbm93IGltcG9ydHMgaXQuIFdpdGhvdXQgdGhlIHdhdGNoZXIsIHRoZXknZCBoaXQgdGhlIHJlc29sdmUgZXJyb3JcbiAqIHVudGlsIHRoZXkgbWFudWFsbHkgcmVzdGFydCB2aXRlOyB3aXRoIGl0LCB3ZSBpbnN0YWxsIGluIHRoZSBiYWNrZ3JvdW5kXG4gKiBhbmQgdHJpZ2dlciB2aXRlJ3Mgb3duIGZ1bGwtcmVsb2FkIHNvIHRoZSBuZXcgbW9kdWxlIGlzIHBpY2tlZCB1cC5cbiAqL1xuZnVuY3Rpb24gZGV2RGVwc1dhdGNoZXIoKTogUGx1Z2luIHtcbiAgY29uc3QgV0FUQ0hfRklMRVMgPSBbXCJwYWNrYWdlLmpzb25cIiwgXCJidW4ubG9ja1wiLCBcImJ1bi5sb2NrYlwiLCBcInBhY2thZ2UtbG9jay5qc29uXCJdO1xuICBsZXQgc3luY2luZyA9IGZhbHNlO1xuXG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJjYXRhbHlzdC1kZXYtZGVwcy13YXRjaGVyXCIsXG4gICAgYXBwbHk6IFwic2VydmVcIixcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBjb25zdCBhYnNQYXRocyA9IFdBVENIX0ZJTEVTLm1hcCgoZikgPT4gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZikpO1xuICAgICAgc2VydmVyLndhdGNoZXIuYWRkKGFic1BhdGhzKTtcblxuICAgICAgY29uc3Qgb25DaGFuZ2UgPSAoZmlsZTogc3RyaW5nKSA9PiB7XG4gICAgICAgIGlmICghYWJzUGF0aHMuaW5jbHVkZXMoZmlsZSkgfHwgc3luY2luZykgcmV0dXJuO1xuICAgICAgICBzeW5jaW5nID0gdHJ1ZTtcbiAgICAgICAgc2VydmVyLmNvbmZpZy5sb2dnZXIuaW5mbyhgW2NhdGFseXN0XSAke3BhdGguYmFzZW5hbWUoZmlsZSl9IGNoYW5nZWQgXHUyMDE0IHN5bmNpbmcgZGVwc1x1MjAyNmApO1xuICAgICAgICBjb25zdCByID0gc3Bhd25TeW5jKFwibm9kZVwiLCBbcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJzY3JpcHRzL3N5bmMtZGVwcy5qc1wiKV0sIHtcbiAgICAgICAgICBzdGRpbzogXCJpbmhlcml0XCIsXG4gICAgICAgICAgY3dkOiBfX2Rpcm5hbWUsXG4gICAgICAgIH0pO1xuICAgICAgICBzeW5jaW5nID0gZmFsc2U7XG4gICAgICAgIGlmIChyLnN0YXR1cyA9PT0gMCkge1xuICAgICAgICAgIHNlcnZlci5jb25maWcubG9nZ2VyLmluZm8oXCJbY2F0YWx5c3RdIGRlcHMgc3luY2VkIFx1MjAxNCB0cmlnZ2VyaW5nIGZ1bGwgcmVsb2FkXCIpO1xuICAgICAgICAgIHNlcnZlci53cy5zZW5kKHsgdHlwZTogXCJmdWxsLXJlbG9hZFwiLCBwYXRoOiBcIipcIiB9KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2VydmVyLndhdGNoZXIub24oXCJjaGFuZ2VcIiwgb25DaGFuZ2UpO1xuICAgICAgc2VydmVyLndhdGNoZXIub24oXCJhZGRcIiwgb25DaGFuZ2UpO1xuICAgIH0sXG4gIH07XG59XG5cbi8qKlxuICogUlVUSExFU1MgQlVJTEQgT1BUSU1JWkVSXG4gKiBXaGVuIFZJVEVfRU5BQkxFX0ZVTExfQVBQIGlzIE5PVCBzZXQgKExvdmFibGUgcHVibGlzaCksXG4gKiBzdHViIG91dCBBTEwgbm9uLWVzc2VudGlhbCBtb2R1bGVzIHNvIFJvbGx1cCBuZXZlciBwcm9jZXNzZXMgdGhlbS5cbiAqIFRoaXMgZWxpbWluYXRlcyAyNCsgY2h1bmsgZ2VuZXJhdGlvbiBhbmQgdGhlaXIgZW50aXJlIGRlcGVuZGVuY3kgdHJlZXMuXG4gKi9cbmZ1bmN0aW9uIHNraXBIZWF2eU1vZHVsZXMoKTogUGx1Z2luIHtcbiAgY29uc3QgZW5hYmxlZCA9IHByb2Nlc3MuZW52LlZJVEVfRU5BQkxFX0ZVTExfQVBQICE9PSAnZmFsc2UnO1xuXG4gIC8vIFBhdHRlcm5zIHRvIHN0dWIgb3V0IGR1cmluZyBsZWFuIGJ1aWxkcyAocHVibGlzaClcbiAgY29uc3QgU1RVQl9QQVRURVJOUyA9IFtcbiAgICAvLyBSb3V0ZSBtYW5pZmVzdCAoNzAwKyByb3V0ZXMpXG4gICAgJ0Z1bGxBcHBSb3V0ZXMnLFxuICAgIC8vIFNpZGViYXJzICgxNSBtb2R1bGVzLCBlYWNoIHdpdGggZGVlcCBkZXBlbmRlbmN5IHRyZWVzKVxuICAgICdVbmlmaWVkU2lkZWJhcicsXG4gICAgJ0VudGVycHJpc2VTaWRlYmFyJyxcbiAgICAnUHJvZHVjdFJvb21TaWRlYmFyJyxcbiAgICAnUHJvamVjdFNpZGViYXInLFxuICAgICdPcGVyYXRpb25zU2lkZWJhcicsICAgICAgLy8gUmVsZWFzZVJvb21TaWRlYmFyXG4gICAgJ1Rlc3RNYW5hZ2VtZW50U2lkZWJhcicsXG4gICAgJ1JlbGVhc2VzTWFuYWdlbWVudFNpZGViYXInLFxuICAgICdSZWxlYXNlSHViU2lkZWJhcicsXG4gICAgJ0luY2lkZW50SHViU2lkZWJhcicsXG4gICAgJ1BsYW5IdWJTaWRlYmFyJyxcbiAgICAnVGFza0h1YlNpZGViYXInLFxuICAgICdUZXN0SHViU2lkZWJhcicsXG4gICAgJ1dvcmtIdWJTaWRlYmFyJyxcbiAgICAnUHJvamVjdEh1YlNpZGViYXInLFxuICAgICdXaWtpU2lkZWJhcicsXG4gICAgLy8gSGVhdnkgaGVhZGVyIHN1Yi1jb21wb25lbnRzXG4gICAgJ0NyZWF0ZURyb3Bkb3duJyxcbiAgICAnR2xvYmFsU2VhcmNoUGFsZXR0ZScsXG4gICAgJ05vdGlmaWNhdGlvbnNQYW5lbCcsXG4gICAgJ1Byb2dyYW1TZWxlY3RvckRyb3Bkb3duJyxcbiAgICAnUHJvamVjdFNlbGVjdG9yRHJvcGRvd24nLFxuICAgICdQcm9kdWN0U2VsZWN0b3JEcm9wZG93bicsXG4gICAgJ01vYmlsZU5hdmlnYXRpb25NZW51JyxcbiAgICAnUmVsZWFzZURyb3Bkb3duJyxcbiAgICAnQ3JlYXRlRW50aXR5RGlhbG9nJyxcbiAgICAvLyBIZWF2eSBwYW5lbHNcbiAgICAnQ2F0YWx5c3RBSVBhbmVsJyxcbiAgICAnQW5ub3VuY2VtZW50QmFubmVyJyxcbiAgICAnRm9yWW91RGV0YWlsUGFuZWwnLFxuICBdO1xuXG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3NraXAtaGVhdnktbW9kdWxlcycsXG4gICAgZW5mb3JjZTogJ3ByZScsXG4gICAgcmVzb2x2ZUlkKHNvdXJjZSkge1xuICAgICAgaWYgKGVuYWJsZWQpIHJldHVybjsgLy8gRnVsbCBhcHAgbW9kZSBcdTIwMTQgbGV0IGV2ZXJ5dGhpbmcgdGhyb3VnaFxuICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIFNUVUJfUEFUVEVSTlMpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5pbmNsdWRlcyhwYXR0ZXJuKSkge1xuICAgICAgICAgIHJldHVybiBgXFwwc3R1Yi0ke3BhdHRlcm59YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbG9hZChpZCkge1xuICAgICAgaWYgKGlkLnN0YXJ0c1dpdGgoJ1xcMHN0dWItJykpIHtcbiAgICAgICAgLy8gUmV0dXJuIGEgbm8tb3AgY29tcG9uZW50IHRoYXQgY2FuIGJlIHVzZWQgYXMgYm90aCBkZWZhdWx0IGFuZCBuYW1lZCBleHBvcnRcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICBleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTdHViKCkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICAgIGV4cG9ydCBjb25zdCAke2lkLnJlcGxhY2UoJ1xcMHN0dWItJywgJycpfSA9IFN0dWI7XG4gICAgICAgIGA7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlLCBjb21tYW5kIH0pID0+IHtcbiAgLy8gT25seSBzdHViIG1vZHVsZXMgZHVyaW5nIHByb2R1Y3Rpb24gYnVpbGQsIG5ldmVyIGluIGRldiBzZXJ2ZXJcbiAgY29uc3QgaXNCdWlsZCA9IGNvbW1hbmQgPT09ICdidWlsZCc7XG5cbiAgcmV0dXJuIHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCIwLjAuMC4wXCIsXG4gICAgcG9ydDogODA4MCxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIGlzQnVpbGQgPyBza2lwSGVhdnlNb2R1bGVzKCkgOiBudWxsLFxuICAgICFpc0J1aWxkICYmIGRldkRlcHNXYXRjaGVyKCksXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxuICAvLyBAYXRsYXNraXQgcGFja2FnZXMgcmVmZXJlbmNlIE5vZGUncyBgcHJvY2Vzcy5lbnYuTk9ERV9FTlZgIGF0IG1vZHVsZSB0b3AtbGV2ZWwuXG4gIC8vIFNoaW0gaXQgZm9yIHRoZSBicm93c2VyIHNvIHRoZXkgZG9uJ3QgdGhyb3cgXCJwcm9jZXNzIGlzIG5vdCBkZWZpbmVkXCIgYXQgbG9hZCB0aW1lLlxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShtb2RlKSxcbiAgICAncHJvY2Vzcy5lbnYnOiAne30nLFxuICAgICdwcm9jZXNzLnBsYXRmb3JtJzogJ1wiYnJvd3NlclwiJyxcbiAgICAncHJvY2Vzcy52ZXJzaW9uJzogJ1wiXCInLFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgXCJyZWFjdFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3JlYWN0XCIpLFxuICAgICAgXCJyZWFjdC1kb21cIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9yZWFjdC1kb21cIiksXG4gICAgICBcInJlYWN0LWlzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcmVhY3QtaXNcIiksXG4gICAgICAvLyBCcm93c2VyIHBvbHlmaWxsIGZvciBOb2RlJ3MgYGV2ZW50c2AgXHUyMDE0IEBhdGxhc2tpdC9lZGl0b3ItcGx1Z2luLWJsb2NrLWNvbnRyb2xzXG4gICAgICAvLyBpbXBvcnRzIHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJzsgVml0ZSB0cmVhdHMgJ2V2ZW50cycgYXMgYSBOb2RlIGJ1aWx0LWluXG4gICAgICAvLyBieSBkZWZhdWx0LCBzbyB3ZSBmb3JjZSBpdCB0byB0aGUgbnBtIGBldmVudHNgIHBhY2thZ2UuXG4gICAgICBcImV2ZW50c1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL2V2ZW50c1wiKSxcbiAgICAgIC8vIEBhdGxhc2tpdCBuZXN0ZWQgZGVwcyAoZS5nLiBAYXRsYXNraXQvcmVuZGVyZXIvbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC90YXNrLWRlY2lzaW9uKVxuICAgICAgLy8gaW1wb3J0IGJhcmUgJ3JlYWN0LWludGwnLiBXZSByZWRpcmVjdCB0byBAYXRsYXNraXQncyBidW5kbGVkIGFsaWFzXG4gICAgICAvLyBgcmVhY3QtaW50bC1uZXh0YCAod2hpY2ggaXMgaXRzZWxmIGEgcGlubmVkIGFsaWFzIG9mIHJlYWN0LWludGxANS4xOCspLlxuICAgICAgXCJyZWFjdC1pbnRsXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvQGF0bGFza2l0L3JlbmRlcmVyL25vZGVfbW9kdWxlcy9yZWFjdC1pbnRsLW5leHQvaW5kZXguanNcIiksXG4gICAgICAvLyBPdXIgb3duIGNvZGUgaW1wb3J0cyBgcmVhY3QtaW50bC1uZXh0YCBkaXJlY3RseSAoQXRsYXNraXQgY29udmVudGlvbikuXG4gICAgICAvLyBQaW4gaXQgdG8gdGhlIG5lc3RlZCBjb3B5IHNoaXBwZWQgd2l0aCBAYXRsYXNraXQvcmVuZGVyZXIgXHUyMDE0IGd1YXJhbnRlZWQgdG9cbiAgICAgIC8vIGV4aXN0IHNpbmNlIHdlIGRlcGVuZCBvbiBAYXRsYXNraXQvcmVuZGVyZXIuIFRoZSBob2lzdGVkIHRvcC1sZXZlbCBjb3B5XG4gICAgICAvLyBpcyBub3QgcmVsaWFibGUgYWNyb3NzIGluc3RhbGwgZW52aXJvbm1lbnRzIChvbmx5IHByZXNlbnQgd2hlbiBob2lzdGVkKS5cbiAgICAgIFwicmVhY3QtaW50bC1uZXh0XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvQGF0bGFza2l0L3JlbmRlcmVyL25vZGVfbW9kdWxlcy9yZWFjdC1pbnRsLW5leHQvaW5kZXguanNcIiksXG4gICAgICAvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIENSSVRJQ0FMOiBGb3JjZSBhIFNJTkdMRSBQcm9zZU1pcnJvciBpbnN0YW5jZSBzaGFyZWQgYnkgQXRsYXNraXQgKyBUaXB0YXAuXG4gICAgICAvL1xuICAgICAgLy8gQXRsYXNraXQgKEBhdGxhc2tpdC9lZGl0b3ItY29yZSwgQGF0bGFza2l0L3JlbmRlcmVyKSBpbXBvcnRzIGl0c1xuICAgICAgLy8gUHJvc2VNaXJyb3IgdmlhIGBAYXRsYXNraXQvZWRpdG9yLXByb3NlbWlycm9yLzxzdWJwYXRoPmAgKGFuIGludGVybmFsXG4gICAgICAvLyB3cmFwcGVyIHRoYXQgcmUtZXhwb3J0cyBwaW5uZWQgcHJvc2VtaXJyb3ItKiBwYWNrYWdlcykuIFRpcHRhcCBpbXBvcnRzXG4gICAgICAvLyB2aWEgYEB0aXB0YXAvcG0vPHN1YnBhdGg+YCB3aGljaCBpdHNlbGYgZG9lcyBgZXhwb3J0ICogZnJvbSAncHJvc2VtaXJyb3ItKidgLlxuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSB0d28gdHJlZXMgcmVzb2x2ZSB0byBESUZGRVJFTlQgcHJvc2VtaXJyb3ItKiBjb3BpZXMsIGJvdGhcbiAgICAgIC8vIHJlZ2lzdGVyIHRoZSBzYW1lIHNlbGVjdGlvbiBKU09OIElEcyBpbnRvIGEgc2hhcmVkIHJlZ2lzdHJ5IFx1MjE5MlxuICAgICAgLy8gUmFuZ2VFcnJvcjogXCJEdXBsaWNhdGUgdXNlIG9mIHNlbGVjdGlvbiBKU09OIElEIGNlbGxcIi5cbiAgICAgIC8vXG4gICAgICAvLyBGaXg6IHJvdXRlIGV2ZXJ5IEF0bGFza2l0IGZvcmsgc3VicGF0aCB0byB0aGUgdXBzdHJlYW0gYHByb3NlbWlycm9yLSpgXG4gICAgICAvLyBwYWNrYWdlIGF0IHRoZSB0b3Agb2Ygbm9kZV9tb2R1bGVzLiBUaXB0YXAncyBgQHRpcHRhcC9wbS8qYCBhbHJlYWR5XG4gICAgICAvLyByZS1leHBvcnRzIHRob3NlIGV4YWN0IHNhbWUgdXBzdHJlYW0gcGFja2FnZXMgKHRoZXkgYXJlIGRlZHVwZWQgdmlhXG4gICAgICAvLyByZXNvbHZlLmRlZHVwZSBiZWxvdyksIHNvIGJvdGggZWRpdG9ycyBzaGFyZSBhIHNpbmdsZSBpbnN0YW5jZSBhbmRcbiAgICAgIC8vIHRoZSBmdWxsIEF0bGFza2l0IGVkaXRvciBleHBlcmllbmNlIGlzIHByZXNlcnZlZCAxOjEuXG4gICAgICAvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIFwiQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvci9zdGF0ZVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3Byb3NlbWlycm9yLXN0YXRlXCIpLFxuICAgICAgXCJAYXRsYXNraXQvZWRpdG9yLXByb3NlbWlycm9yL21vZGVsXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItbW9kZWxcIiksXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3Ivdmlld1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3Byb3NlbWlycm9yLXZpZXdcIiksXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3IvdHJhbnNmb3JtXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItdHJhbnNmb3JtXCIpLFxuICAgICAgXCJAYXRsYXNraXQvZWRpdG9yLXByb3NlbWlycm9yL2tleW1hcFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3Byb3NlbWlycm9yLWtleW1hcFwiKSxcbiAgICAgIFwiQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvci9oaXN0b3J5XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItaGlzdG9yeVwiKSxcbiAgICAgIFwiQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvci9kcm9wY3Vyc29yXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItZHJvcGN1cnNvclwiKSxcbiAgICAgIFwiQGF0bGFza2l0L2VkaXRvci1wcm9zZW1pcnJvci9jb21tYW5kc1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3Byb3NlbWlycm9yLWNvbW1hbmRzXCIpLFxuICAgICAgXCJAYXRsYXNraXQvZWRpdG9yLXByb3NlbWlycm9yL3V0aWxzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcHJvc2VtaXJyb3ItdXRpbHNcIiksXG4gICAgICBcIkBhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3IvbWFya2Rvd25cIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9wcm9zZW1pcnJvci1tYXJrZG93blwiKSxcbiAgICB9LFxuICAgIC8vIERlZHVwZSBwcm9zZW1pcnJvciBcdTIwMTQgYmVsdC1hbmQtc3VzcGVuZGVycyBhbG9uZ3NpZGUgdGhlIGFsaWFzIGFib3ZlLlxuICAgIGRlZHVwZTogW1xuICAgICAgJ3JlYWN0JyxcbiAgICAgICdyZWFjdC1kb20nLFxuICAgICAgJ3JlYWN0LWlzJyxcbiAgICAgICdwcm9zZW1pcnJvci1zdGF0ZScsXG4gICAgICAncHJvc2VtaXJyb3ItbW9kZWwnLFxuICAgICAgJ3Byb3NlbWlycm9yLXZpZXcnLFxuICAgICAgJ3Byb3NlbWlycm9yLXRyYW5zZm9ybScsXG4gICAgICAncHJvc2VtaXJyb3ItdGFibGVzJyxcbiAgICAgICdwcm9zZW1pcnJvci1rZXltYXAnLFxuICAgICAgJ3Byb3NlbWlycm9yLWNvbW1hbmRzJyxcbiAgICAgICdwcm9zZW1pcnJvci1oaXN0b3J5JyxcbiAgICAgICdwcm9zZW1pcnJvci1pbnB1dHJ1bGVzJyxcbiAgICAgICdwcm9zZW1pcnJvci1zY2hlbWEtYmFzaWMnLFxuICAgICAgJ3Byb3NlbWlycm9yLXNjaGVtYS1saXN0JyxcbiAgICAgICdwcm9zZW1pcnJvci1kcm9wY3Vyc29yJyxcbiAgICAgICdwcm9zZW1pcnJvci1nYXBjdXJzb3InLFxuICAgICAgJ3Byb3NlbWlycm9yLW1lbnUnLFxuICAgICAgJ3Byb3NlbWlycm9yLXV0aWxzJyxcbiAgICAgICdwcm9zZW1pcnJvci1jaGFuZ2VzZXQnLFxuICAgICAgJ3Byb3NlbWlycm9yLWNvbGxhYicsXG4gICAgICAncHJvc2VtaXJyb3ItbWFya2Rvd24nLFxuICAgICAgJ3Byb3NlbWlycm9yLXRyYWlsaW5nLW5vZGUnLFxuICAgIF0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICdyZWFjdCcsXG4gICAgICAncmVhY3QtZG9tJyxcbiAgICAgICdyZWFjdC1pcycsXG4gICAgICAvLyBQcmUtYnVuZGxlIEBhdGxhc2tpdCBwcmltaXRpdmVzIHNvIFN1YnRhc2tzUGFuZWwgbW91bnQgZG9lc24ndCB0cmlnZ2VyXG4gICAgICAvLyBtaWQtZmxpZ2h0IGRlcCByZS1vcHRpbWl6YXRpb24gKHdoaWNoIDQwNHMgaW4tZmxpZ2h0IGNodW5rIHJlcXVlc3RzKS5cbiAgICAgIC8vIFdoZW4gYWRvcHRpbmcgYSBuZXcgQXRsYXNraXQgY29tcG9uZW50IGluIGEgc3VyZmFjZSwgQUREIElUIEhFUkUgc29cbiAgICAgIC8vIGZpcnN0IHJlbmRlciBpcyB3YXJtIGluc3RlYWQgb2Ygc3RhbGxpbmcgb24gY29sZCBvcHRpbWl6ZS5cbiAgICAgICdAYXRsYXNraXQvYXZhdGFyJyxcbiAgICAgICdAYXRsYXNraXQvYnJlYWRjcnVtYnMnLFxuICAgICAgJ0BhdGxhc2tpdC9kcm9wZG93bi1tZW51JyxcbiAgICAgICdAYXRsYXNraXQvZHluYW1pYy10YWJsZScsXG4gICAgICAnQGF0bGFza2l0L2xvemVuZ2UnLFxuICAgICAgJ0BhdGxhc2tpdC9wb3B1cCcsXG4gICAgICAnQGF0bGFza2l0L3ByaW1pdGl2ZXMnLFxuICAgICAgJ0BhdGxhc2tpdC90ZXh0ZmllbGQnLFxuICAgICAgJ0BhdGxhc2tpdC90b2tlbnMnLFxuICAgICAgLy8gTk9URTogQGF0bGFza2l0L2VkaXRvci1jb3JlIGFuZCBAYXRsYXNraXQvcmVuZGVyZXIgYXJlIGludGVudGlvbmFsbHlcbiAgICAgIC8vIEVYQ0xVREVEIGhlcmUuIFRoZXkgYnVuZGxlIHRoZWlyIG93biBQcm9zZU1pcnJvciB0cmVlIGFuZCBjbGFzaCB3aXRoXG4gICAgICAvLyBUaXB0YXAgaWYgZWFnZXJseSBsb2FkZWQuIEF0bGFza2l0RWRpdG9yLnRzeCBsYXp5LWltcG9ydHMgZWRpdG9yLWNvcmVcbiAgICAgIC8vIHZpYSBSZWFjdC5sYXp5IHNvIGl0IG9ubHkgZW50ZXJzIHRoZSBwYWdlIHdoZW4gYW4gZWRpdG9yIGlzIG1vdW50ZWQuXG4gICAgICAvLyBQcmUtYnVuZGxlIHByb3NlbWlycm9yIHNvIGVkaXRvci1jb3JlICsgcmVuZGVyZXIgc2hhcmUgT05FIGluc3RhbmNlLlxuICAgICAgJ3Byb3NlbWlycm9yLXN0YXRlJyxcbiAgICAgICdwcm9zZW1pcnJvci1tb2RlbCcsXG4gICAgICAncHJvc2VtaXJyb3ItdmlldycsXG4gICAgICAncHJvc2VtaXJyb3ItdHJhbnNmb3JtJyxcbiAgICAgICdwcm9zZW1pcnJvci10YWJsZXMnLFxuICAgICAgJ3Byb3NlbWlycm9yLWtleW1hcCcsXG4gICAgICAncHJvc2VtaXJyb3ItY29tbWFuZHMnLFxuICAgICAgJ3Byb3NlbWlycm9yLWhpc3RvcnknLFxuICAgICAgJ3Byb3NlbWlycm9yLWlucHV0cnVsZXMnLFxuICAgICAgJ3Byb3NlbWlycm9yLXNjaGVtYS1iYXNpYycsXG4gICAgICAncHJvc2VtaXJyb3Itc2NoZW1hLWxpc3QnLFxuICAgICAgJ3Byb3NlbWlycm9yLWRyb3BjdXJzb3InLFxuICAgICAgJ3Byb3NlbWlycm9yLWdhcGN1cnNvcicsXG4gICAgICAncHJvc2VtaXJyb3ItdXRpbHMnLFxuICAgIF0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTIwMCxcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIC8vIFN0YWJsZSB2ZW5kb3IgY2h1bmtzIGZvciBiZXR0ZXIgbG9uZy10ZXJtIGNhY2hpbmdcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LWRvbS8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LXJvdXRlcicpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0ByYWRpeC11aS8nKSkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItdWknO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AdGFuc3RhY2svJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXF1ZXJ5JztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVjaGFydHMnKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2QzJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWNoYXJ0cyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXHUyNTUwXG4gICAgICAgICAgLy8gTEFZRVIgNCBcdTIwMTQgQXRsYXNraXQgY2h1bmsgc3BsaXQgYWxvbmcgQXRsYXNzaWFuIHBhY2thZ2UgYm91bmRhcmllcy5cbiAgICAgICAgICAvLyBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcbiAgICAgICAgICAvLyBCZWZvcmU6IGV2ZXJ5IEBhdGxhc2tpdC8qLCBldmVyeSBAdGlwdGFwLyogYW5kIGV2ZXJ5IHByb3NlbWlycm9yLSpcbiAgICAgICAgICAvLyBwYWNrYWdlIHdhcyBmdXNlZCBpbnRvIG9uZSB+NE1CIGB2ZW5kb3ItZWRpdG9yYCBjaHVuay4gQW55IGZlYXR1cmVcbiAgICAgICAgICAvLyB0aGF0IG1vdW50ZWQgYW4gQXRsYXNraXQgcHJpbWl0aXZlIChMb3plbmdlLCBBdmF0YXIsIER5bmFtaWNUYWJsZSlcbiAgICAgICAgICAvLyBwYWlkIHRoZSBmdWxsIGVkaXRvci1jb3JlICsgcmVuZGVyZXIgKyBlZGl0b3ItcGx1Z2luLSogY29zdCB1cFxuICAgICAgICAgIC8vIGZyb250IFx1MjAxNCB0aGF0J3Mgd2hhdCBtYWRlIEJBVS00NzcxJ3MgRXBpYyB2aWV3IHNsb3cgdG8gb3Blbi5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIEFmdGVyOiBjaHVua3MgbWF0Y2ggQXRsYXNzaWFuJ3Mgb3duIHBhY2thZ2UgYm91bmRhcmllcyBzbyBlYWNoXG4gICAgICAgICAgLy8gc3VyZmFjZSBvbmx5IGRvd25sb2FkcyB3aGF0IGl0IHJlbmRlcnMuIGBpZmAgT1JERVIgSVMgTE9BRC1CRUFSSU5HXG4gICAgICAgICAgLy8gXHUyMDE0IGVkaXRvci1wbHVnaW4tKiBhbmQgZWRpdG9yLSogbXVzdCBiZSBtYXRjaGVkIEJFRk9SRSB0aGUgZ2VuZXJpY1xuICAgICAgICAgIC8vIGBAYXRsYXNraXQvYCBjYXRjaC1hbGwsIG9yIHBsdWdpbnMgbGVhayBpbnRvIHRoZSB1aSBjaHVuay5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vICAgdmVuZG9yLXByb3NlbWlycm9yICAgICAgUHJvc2VNaXJyb3IgY29yZSAoc2hhcmVkIGJ5IGVkaXRvciArXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJlciArIHRpcHRhcDsgZGVkdXBlZCB2aWFcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGByZXNvbHZlLmRlZHVwZWAgYWJvdmUpLiBNdXN0IGJlIGFcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWJsZSBzaW5nbGV0b24gb3IgUE0gdGhyb3dzXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBcIkR1cGxpY2F0ZSB1c2Ugb2Ygc2VsZWN0aW9uIEpTT04gSURcIi5cbiAgICAgICAgICAvLyAgIHZlbmRvci1hdGxhc2tpdC1lZGl0b3IgIGVkaXRvci1jb3JlICsgYWxsIGVkaXRvci1wbHVnaW4tKiArXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0b3ItY29tbW9uICsgZWRpdG9yLWpzb24tdHJhbnNmb3JtZXIuXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBPbmx5IGxvYWRlZCB3aGVuIHRoZSB1c2VyIGNsaWNrcyBFZGl0XG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBvbiBhbiBFcGljIGRlc2NyaXB0aW9uLiB+Mk1CLlxuICAgICAgICAgIC8vICAgdmVuZG9yLWF0bGFza2l0LXJlbmRlcmVyICBAYXRsYXNraXQvcmVuZGVyZXIuIExvYWRlZCBvbiBFcGljXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LiB+NDAwXHUyMDEzNjAwS0IuXG4gICAgICAgICAgLy8gICB2ZW5kb3ItYXRsYXNraXQtYWRmICAgICBAYXRsYXNraXQvYWRmLSogdXRpbGl0aWVzLiBUaW55LFxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hhcmVkIGJ5IGVkaXRvciArIHJlbmRlcmVyICsgdGhlXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluLWJ1bmRsZSBgYWRmVG9QbGFpblRleHRgLlxuICAgICAgICAgIC8vICAgdmVuZG9yLWF0bGFza2l0LW1lZGlhICAgQGF0bGFza2l0L21lZGlhLSogKGV4dGVybmFsIG1lZGlhXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBzdXBwb3J0KS4gTG9hZGVkIGFsb25nc2lkZSByZW5kZXJlci5cbiAgICAgICAgICAvLyAgIHZlbmRvci1hdGxhc2tpdC11aSAgICAgIHByaW1pdGl2ZXMgdXNlZCBieSBTdWJ0YXNrc1BhbmVsIC9cbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIExpbmtlZFdvcmtJdGVtczogYXZhdGFyLCBsb3plbmdlLFxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJvcGRvd24tbWVudSwgcG9wdXAsIHNlbGVjdCxcbiAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRmaWVsZCwgdG9rZW5zLCBpY29uLCBidXR0b24sXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2JveCwgcHJpbWl0aXZlcywgcHJvZ3Jlc3MtYmFyLlxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2FjaGVkIG9uY2UsIHJldXNlZCBvbiBldmVyeSBmZWF0dXJlLlxuICAgICAgICAgIC8vICAgdmVuZG9yLXRpcHRhcCAgICAgICAgICAgdGlwdGFwIGVkaXRvciAobGVnYWN5IG5vbi1FcGljIHBhdGgpLlxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgSXNvbGF0ZWQgZnJvbSBBdGxhc2tpdCBzbyBjaGFuZ2VzIHRvXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBvbmUgZG9uJ3QgYnVzdCB0aGUgb3RoZXIncyBjYWNoZS5cbiAgICAgICAgICAvLyBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcdTI1NTBcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9wcm9zZW1pcnJvci0nKSkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItcHJvc2VtaXJyb3InO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItY29yZScpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItY29tbW9uJykgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1wbHVnaW4tJykgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1qc29uLXRyYW5zZm9ybWVyJykgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0L2VkaXRvci1tYXJrZG93bi10cmFuc2Zvcm1lcicpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItcGFsZXR0ZScpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItcGVyZm9ybWFuY2UtbWV0cmljcycpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BhdGxhc2tpdC9lZGl0b3ItcHJvc2VtaXJyb3InKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvZWRpdG9yLXRhYmxlcycpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1hdGxhc2tpdC1lZGl0b3InO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvcmVuZGVyZXInKSkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItYXRsYXNraXQtcmVuZGVyZXInO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvYWRmLScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1hdGxhc2tpdC1hZGYnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AYXRsYXNraXQvbWVkaWEtJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWF0bGFza2l0LW1lZGlhJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGF0bGFza2l0LycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1hdGxhc2tpdC11aSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0B0aXB0YXAvJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXRpcHRhcCc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZnJhbWVyLW1vdGlvbicpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1tb3Rpb24nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9leGNlbGpzJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy94bHN4JykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9qc3BkZicpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcHB0eGdlbmpzJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9qc3ppcCcpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvaHRtbDJjYW52YXMnKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2ZpbGUtc2F2ZXInKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3BhcGFwYXJzZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1leHBvcnQnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9sdWNpZGUtcmVhY3QnKSkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItaWNvbnMnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9kYXRlLWZucycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1kYXRlJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvem9kJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1ob29rLWZvcm0nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0Bob29rZm9ybS8nKSkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItZm9ybXMnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9Ac3VwYWJhc2UvJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXN1cGFiYXNlJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThVLFNBQVMsb0JBQTRCO0FBQ25YLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxpQkFBaUI7QUFDMUIsU0FBUyx1QkFBdUI7QUFKaEMsSUFBTSxtQ0FBbUM7QUFxQnpDLElBQUk7QUFDRixZQUFVLFFBQVEsQ0FBQyxLQUFLLFFBQVEsa0NBQVcsc0JBQXNCLENBQUMsR0FBRztBQUFBLElBQ25FLE9BQU87QUFBQSxJQUNQLEtBQUs7QUFBQSxFQUNQLENBQUM7QUFDSCxRQUFRO0FBR1I7QUFhQSxTQUFTLGlCQUF5QjtBQUNoQyxRQUFNLGNBQWMsQ0FBQyxnQkFBZ0IsWUFBWSxhQUFhLG1CQUFtQjtBQUNqRixNQUFJLFVBQVU7QUFFZCxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxnQkFBZ0IsUUFBUTtBQUN0QixZQUFNLFdBQVcsWUFBWSxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsa0NBQVcsQ0FBQyxDQUFDO0FBQ2xFLGFBQU8sUUFBUSxJQUFJLFFBQVE7QUFFM0IsWUFBTSxXQUFXLENBQUMsU0FBaUI7QUFDakMsWUFBSSxDQUFDLFNBQVMsU0FBUyxJQUFJLEtBQUssUUFBUztBQUN6QyxrQkFBVTtBQUNWLGVB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
