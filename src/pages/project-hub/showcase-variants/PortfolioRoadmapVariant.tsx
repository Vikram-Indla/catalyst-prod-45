/**
 * Variant 5 — pages/PortfolioRoadmap
 * Quarter/month swimlane cards grouped by theme / program / epic. Health badges, progress bars.
 */
import React from 'react';
import PortfolioRoadmap from '@/pages/PortfolioRoadmap';

export default function PortfolioRoadmapVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <PortfolioRoadmap />
    </div>
  );
}
