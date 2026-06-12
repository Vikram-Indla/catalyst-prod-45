/**
 * Variant 3 — modules/product-roadmap/ProductRoadmap
 * Full-featured: drag & drop, List / Timeline / Swimlane view modes, filter dialog, export.
 * Uses its own useRoadmapDemands hook — will show empty state or loading against real DB.
 */
import React from 'react';
import { ProductRoadmap } from '@/modules/product-roadmap/components/ProductRoadmap';

export default function ProductRoadmapV2Variant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <ProductRoadmap />
    </div>
  );
}
