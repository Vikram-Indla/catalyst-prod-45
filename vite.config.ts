import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-backend';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('@atlaskit')) return 'vendor-atlaskit';
            if (id.includes('@tiptap')) return 'vendor-editor';
            if (id.includes('d3') || id.includes('recharts')) return 'vendor-charts';
            if (id.includes('jspdf') || id.includes('exceljs') || id.includes('xlsx') || id.includes('pptxgenjs') || id.includes('html2canvas')) return 'vendor-export';
          }
          if (id.includes('/src/components/caty-ai/') || id.includes('/src/components/knowledge-assist/') || id.includes('/src/components/testhub-ai/')) {
            return 'feature-ai-widgets';
          }
          if (id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')) return 'feature-admin';
          if (id.includes('/src/pages/testhub/') || id.includes('/src/features/test-execution/')) return 'feature-testhub';
        },
      },
    },
  },
}));
