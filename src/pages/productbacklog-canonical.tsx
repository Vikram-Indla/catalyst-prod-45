/**
 * ProductBacklog Canonical Test Page — /productbacklog-canonical
 *
 * Mounts ProductBacklogListTable for functional testing of:
 * - Data fetching and rendering
 * - Drag-and-drop rank updates
 * - Row actions menu
 * - Multi-select and bulk operations
 * - Error/loading/empty states
 * - Responsive layout
 * - Keyboard navigation and Escape handler
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductBacklogListTable from '@/modules/product-backlog/components/ProductBacklogListTable';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: 1 },
  },
});

export default function ProductBacklogCanonicalPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#F7F8F9' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: '#172B4D' }}>
            Product Backlog (Canonical)
          </h1>
          <p style={{ fontSize: '14px', color: '#626F86', marginBottom: '24px' }}>
            Canonical business_request table — reusable pattern for all future Catalyst tables
          </p>

          <ProductBacklogListTable projectId="catalyst-product" />
        </div>
      </div>
    </QueryClientProvider>
  );
}
