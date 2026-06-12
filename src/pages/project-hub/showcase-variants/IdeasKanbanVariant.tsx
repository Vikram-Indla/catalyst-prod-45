/**
 * Variant 8 — pages/product/ideas/IdeasRoadmapPage
 * Kanban-style roadmap for Ideas: columns = Now / Next / Later, drag & drop, committed toggle.
 */
import React from 'react';
import IdeasRoadmapPage from '@/pages/product/ideas/IdeasRoadmapPage';

export default function IdeasKanbanVariant({ projectKey: _ }: { projectKey: string }) {
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <IdeasRoadmapPage />
    </div>
  );
}
