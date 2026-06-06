/**
 * Enterprise/Product Hub/Roadmap Parts — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { AddRequestModal } from '@/components/product-hub/roadmap/AddRequestModal';
import { RoadmapDetailPanel } from '@/components/product-hub/roadmap/RoadmapDetailPanel';
import { RoadmapGanttChart } from '@/components/product-hub/roadmap/RoadmapGanttChart';
import { RoadmapTimeline } from '@/components/product-hub/roadmap/RoadmapTimeline';
import { RoadmapTimelineBar } from '@/components/product-hub/roadmap/RoadmapTimelineBar';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></QueryClientProvider></div>);
}

export default { title: 'Enterprise/Product Hub/Roadmap Parts' };

export const RoadmapDetailPanelDefault: StoryObj = {
  name: 'RoadmapDetailPanel / Default',
  render: () => <Wrap><RoadmapDetailPanel item=null isOpen=true onClose={fn()} /></Wrap>,
}

export const RoadmapDetailPanelOpen: StoryObj = {
  name: 'RoadmapDetailPanel / Open',
  render: () => <Wrap><RoadmapDetailPanel item=null isOpen=true onClose={fn()} /></Wrap>,
}

export const RoadmapGanttChartDefault: StoryObj = {
  name: 'RoadmapGanttChart / Default',
  render: () => <Wrap><RoadmapGanttChart groups=[] timelineStart={{{}}} timelineEnd={{{}}} zoom={{{}}} selectedId="test-value" hoveredId="test-value" onSelect={fn()} onHover={fn()} collapsedGroups={{{}}} onToggleGroup={fn()} /></Wrap>,
}

export const RoadmapTimelineDefault: StoryObj = {
  name: 'RoadmapTimeline / Default',
  render: () => <Wrap><RoadmapTimeline groups=[] zoom={{{}}} timelineStart={{{}}} timelineEnd={{{}}} selectedId="test-value" hoveredId="test-value" onSelect={fn()} onHover={fn()} onAddClick={fn()} onToggleStar={fn()} /></Wrap>,
}

export const RoadmapTimelineBarDefault: StoryObj = {
  name: 'RoadmapTimelineBar / Default',
  render: () => <Wrap><RoadmapTimelineBar item={{{}}} left=42 width=42 isSelected=false isHovered=false onClick={fn()} /></Wrap>,
}

export const AddRequestModalDefault: StoryObj = {
  name: 'AddRequestModal / Default',
  render: () => <Wrap><AddRequestModal isOpen=true onClose={fn()} /></Wrap>,
}

export const AddRequestModalOpen: StoryObj = {
  name: 'AddRequestModal / Open',
  render: () => <Wrap><AddRequestModal isOpen=true onClose={fn()} /></Wrap>,
}
