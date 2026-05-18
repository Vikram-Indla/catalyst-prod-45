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

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductBacklogListTable from '@/modules/product-backlog/components/ProductBacklogListTable';
import type { BusinessRequest } from '@/types/business-request';

// Mock business requests for canonical testing
const MOCK_REQUESTS: BusinessRequest[] = [
  {
    id: '1',
    request_key: 'BR-1001',
    title: 'Setup monitoring dashboard',
    process_step: 'approved',
    rank: 1,
    priority_tier: 'high',
    business_score: 85,
    assignee: 'user-123',
    business_owner: 'jane@example.com',
    department: 'Engineering',
    project_id: 'catalyst-product',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: '2',
    request_key: 'BR-1002',
    title: 'Implement caching layer',
    process_step: 'in_review',
    rank: 2,
    priority_tier: 'high',
    business_score: 72,
    assignee: 'user-456',
    business_owner: 'bob@example.com',
    department: 'Engineering',
    project_id: 'catalyst-product',
    created_at: new Date('2026-01-02').toISOString(),
  },
  {
    id: '3',
    request_key: 'BR-1003',
    title: 'Upgrade database',
    process_step: 'analyse',
    rank: 3,
    priority_tier: 'medium',
    business_score: 65,
    assignee: null,
    business_owner: 'alice@example.com',
    department: 'Infrastructure',
    project_id: 'catalyst-product',
    created_at: new Date('2026-01-03').toISOString(),
  },
  {
    id: '4',
    request_key: 'BR-1004',
    title: 'API rate limiting',
    process_step: 'new_request',
    rank: 4,
    priority_tier: 'low',
    business_score: 45,
    assignee: null,
    business_owner: 'bob@example.com',
    department: 'Engineering',
    project_id: 'catalyst-product',
    created_at: new Date('2026-01-04').toISOString(),
  },
  {
    id: '5',
    request_key: 'BR-1005',
    title: 'Security audit report',
    process_step: 'implement',
    rank: 5,
    priority_tier: 'high',
    business_score: 90,
    assignee: 'user-789',
    business_owner: 'jane@example.com',
    department: 'Security',
    project_id: 'catalyst-product',
    created_at: new Date('2026-01-05').toISOString(),
  },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: 1 },
  },
});

// Set up mock data on mount
queryClient.setQueryData(['business-requests', 'catalyst-product', 'rank'], MOCK_REQUESTS);

export default function ProductBacklogCanonicalPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#F7F8F9' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))' }}>
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
