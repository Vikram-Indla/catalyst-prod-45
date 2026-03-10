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
  const enabled = process.env.VITE_ENABLE_FULL_APP === 'true';

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
    host: "::",
    port: 8080,
  },
  plugins: [
    isBuild ? skipHeavyModules() : null,
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-backend';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('@tanstack/react-table') || id.includes('@tanstack/react-virtual')) return 'vendor-table';
            if (id.includes('@tiptap')) return 'vendor-editor';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('d3')) return 'vendor-d3';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('jspdf') || id.includes('xlsx') || id.includes('pptxgenjs') || id.includes('html2canvas')) return 'vendor-export';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('zustand') || id.includes('zod') || id.includes('date-fns')) return 'vendor-utils';
          }
          if (id.includes('/src/components/caty-ai/') || id.includes('/src/components/knowledge-assist/') || id.includes('/src/components/testhub-ai/')) return 'feature-ai-widgets';
          if (id.includes('/src/components/caty/') || id.includes('/src/components/kb/')) return 'feature-ai-fab';
          if (id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')) return 'feature-admin';
          if (id.includes('/src/pages/testhub/') || id.includes('/src/features/test-execution/')) return 'feature-testhub';
          if (id.includes('/src/modules/incidents/') || id.includes('/src/pages/release/')) return 'feature-incidents';
          if (id.includes('/src/pages/wiki/') || id.includes('/src/components/wiki/')) return 'feature-wiki';
          if (id.includes('/src/modules/workhub/') || id.includes('/src/components/workhub/')) return 'feature-workhub';
          if (id.includes('/src/pages/releasehub/') || id.includes('/src/pages/releases/')) return 'feature-releases';
          if (id.includes('/src/modules/in-jira/')) return 'feature-injira';
          if (id.includes('/src/pages/enterprise/') || id.includes('/src/pages/strategy/')) return 'feature-enterprise';
          if (id.includes('/src/modules/planner/') || id.includes('/src/modules/task10/')) return 'feature-planner';
          if (id.includes('/src/pages/project-hub/') || id.includes('/src/components/project-hub/')) return 'feature-projecthub';
          if (id.includes('/src/pages/producthub/') || id.includes('/src/modules/product-backlog/')) return 'feature-producthub';
        },
      },
    },
  },
};
});
