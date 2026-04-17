import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
      "react-intl": path.resolve(__dirname, "./node_modules/react-intl-next"),
    },
    // Dedupe prosemirror — @atlaskit/editor-core and @atlaskit/renderer each
    // bundle their own prosemirror tree, which causes RangeError "Duplicate use
    // of selection JSON ID cell" when both load. Force a single instance.
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
      '@atlaskit/avatar',
      '@atlaskit/dropdown-menu',
      '@atlaskit/dynamic-table',
      '@atlaskit/lozenge',
      '@atlaskit/popup',
      '@atlaskit/textfield',
      '@atlaskit/tokens',
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
          if (id.includes('node_modules/@tiptap/') || id.includes('node_modules/prosemirror') || id.includes('node_modules/@atlaskit/')) {
            return 'vendor-editor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/exceljs') || id.includes('node_modules/xlsx') || id.includes('node_modules/jspdf') || id.includes('node_modules/pptxgenjs') || id.includes('node_modules/jszip') || id.includes('node_modules/html2canvas') || id.includes('node_modules/file-saver') || id.includes('node_modules/papaparse')) {
            return 'vendor-export';
          }
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
