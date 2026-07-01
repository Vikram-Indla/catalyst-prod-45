/**
 * Stories for Product Hub roadmap sub-components and BR form elements.
 */
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoadmapKPIStrip } from '@/components/product-hub/roadmap/RoadmapKPIStrip';
import { RoadmapFilters } from '@/components/product-hub/roadmap/RoadmapFilters';
import { RoadmapToolbar } from '@/components/product-hub/roadmap/RoadmapToolbar';
import { RoadmapRequestList } from '@/components/product-hub/roadmap/RoadmapRequestList';
import { ProgressRing } from '@/components/business-requests/create-form/ProgressRing';
import { BrTranslateButton } from '@/components/business-requests/shared/BrTranslateButton';
import type { RoadmapStats, RoadmapGroup, RoadmapRequest } from '@/components/product-hub/roadmap/types/roadmap.types';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <QueryClientProvider client={qc}><div style={{ maxWidth: width, padding: 16 }}>{children}</div></QueryClientProvider>;
}

export default { title: 'Pages/Product Hub/Roadmap' };

// ─── RoadmapKPIStrip ───────────────────────────────────────────────────────

const stats: RoadmapStats = {
  totalOnRoadmap: 24, totalInitiatives: 18, activeCount: 12,
  validationCount: 6, currentQuarter: 'Q2 2026',
};

export const KPIStrip: StoryObj = {
  render: () => <Wrap width={1100}><RoadmapKPIStrip stats={stats} /></Wrap>,
};

export const KPIStripEmpty: StoryObj = {
  render: () => <Wrap width={1100}><RoadmapKPIStrip stats={{ totalOnRoadmap: 0, totalInitiatives: 0, activeCount: 0, validationCount: 0, currentQuarter: 'Q2 2026' }} /></Wrap>,
};

// ─── RoadmapFilters ────────────────────────────────────────────────────────

export const FiltersDefault: StoryObj = {
  render: () => {
    const [search, setSearch] = useState('');
    const [qf, setQf] = useState<string>('all');
    return (
      <Wrap>
        <RoadmapFilters
          search={search} onSearchChange={setSearch}
          quickFilter={qf as any} onQuickFilterChange={setQf as any}
        />
      </Wrap>
    );
  },
};

export const FiltersWithSearch: StoryObj = {
  render: () => (
    <Wrap>
      <RoadmapFilters
        search="customs" onSearchChange={fn()}
        quickFilter={'all' as any} onQuickFilterChange={fn()}
      />
    </Wrap>
  ),
};

// ─── RoadmapToolbar ────────────────────────────────────────────────────────

export const ToolbarDefault: StoryObj = {
  render: () => (
    <Wrap width={1100}>
      <RoadmapToolbar
        zoom="Month" onZoomChange={fn()}
        groupBy="priority" onGroupByChange={fn()}
        viewMode="Timeline" onViewModeChange={fn()}
        onToday={fn()} zoomScale={1} onZoomScaleChange={fn()}
      />
    </Wrap>
  ),
};

// ─── RoadmapRequestList ────────────────────────────────────────────────────

// ads-scanner:ignore-next-line — Storybook mock data with test colors
const mockRequest = (id: string, title: string, priority: string, status: string): RoadmapRequest => ({
  id, initiativeKey: `MDT-${id}`, title, titleAr: title, titleEn: title,
  type: 'business_request', priority: priority as any, status: status as any,
  progress: 45, startDate: '2026-04-01', endDate: '2026-06-30',
  // ads-scanner:ignore-next-line — story mock data
  ownerName: 'Vikram Indla', ownerInitials: 'VI', ownerColor: 'var(--ds-background-brand-bold)', starred: false,
} as any);

// ads-scanner:ignore-next-line — Storybook mock data with test colors
const groups: RoadmapGroup[] = [
  {
    // ads-scanner:ignore-next-line — story mock data
    key: 'p0', label: 'P0 — Critical', color: 'var(--ds-background-danger-bold)', isExpanded: true,
    items: [
      mockRequest('801', 'Customs Exemption Workflow Redesign', 'P0', 'Active'),
      mockRequest('802', 'Fast Track Shipping Integration', 'P0', 'Active'),
    ],
  },
  {
    // ads-scanner:ignore-next-line — story mock data
    key: 'p1', label: 'P1 — High', color: 'var(--ds-background-warning-bold)', isExpanded: true,
    items: [
      mockRequest('811', 'Know Your Journey Platform', 'P1', 'Planned'),
      mockRequest('812', 'Support Tickets — Senaei Post Login', 'P1', 'Active'),
    ],
  },
];

export const RequestListDefault: StoryObj = {
  render: () => (
    <Wrap width={400}>
      <RoadmapRequestList
        groups={groups} selectedId={null} hoveredId={null}
        onSelect={fn()} onHover={fn()} onAddClick={fn()} onToggleStar={fn()}
      />
    </Wrap>
  ),
};

export const RequestListWithSelection: StoryObj = {
  render: () => (
    <Wrap width={400}>
      <RoadmapRequestList
        groups={groups} selectedId="801" hoveredId="802"
        onSelect={fn()} onHover={fn()} onAddClick={fn()} onToggleStar={fn()}
      />
    </Wrap>
  ),
};

// ─── ProgressRing (BR Create Form) ────────────────────────────────────────

export const ProgressRing0: StoryObj = {
  render: () => <ProgressRing percent={0} />,
};

export const ProgressRing50: StoryObj = {
  render: () => <ProgressRing percent={50} />,
};

export const ProgressRing100: StoryObj = {
  render: () => <ProgressRing percent={100} />,
};

// ─── BrTranslateButton ────────────────────────────────────────────────────

export const TranslateIdle: StoryObj = {
  render: () => <BrTranslateButton loading={false} label="Translate to Arabic" onClick={fn()} />,
};

export const TranslateLoading: StoryObj = {
  render: () => <BrTranslateButton loading={true} label="Translating..." onClick={fn()} />,
};
