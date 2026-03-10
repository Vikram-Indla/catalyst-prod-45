import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * When VITE_ENABLE_FULL_APP is NOT set (Lovable publish),
 * replace FullAppRoutes with a no-op module so Rollup never
 * follows the 200+ page imports inside it.
 */
function skipFullRoutes(): Plugin {
  const enabled = process.env.VITE_ENABLE_FULL_APP === 'true';
  return {
    name: 'skip-full-routes',
    enforce: 'pre',
    resolveId(source) {
      if (!enabled && source.includes('FullAppRoutes')) {
        return '\0empty-full-routes';
      }
    },
    load(id) {
      if (id === '\0empty-full-routes') {
        return 'export default function FullAppRoutes() { return null; }';
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    skipFullRoutes(),
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
}));
