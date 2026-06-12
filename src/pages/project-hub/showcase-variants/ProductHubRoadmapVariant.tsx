/**
 * Variant 9 — components/product-hub/roadmap/ProductRoadmapPage
 * Full Gantt for Business Requests: horizontal bars, filter sidebar, detail panel.
 */
import React from 'react';
import { ProductRoadmapPage } from '@/components/product-hub/roadmap/ProductRoadmapPage';

export default function ProductHubRoadmapVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <ProductRoadmapPage />
    </div>
  );
}
