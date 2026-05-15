import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { DashboardWorkflowPath } from './DashboardWorkflowPath';
import { AtAGlanceWidget } from './widgets/AtAGlanceWidget';
import { StageOverviewWidget } from './widgets/StageOverviewWidget';
import { NeedsAttentionWidget } from './widgets/NeedsAttentionWidget';
import { ActiveInterventionsWidget } from './widgets/ActiveInterventionsWidget';
import { WhoCarriesWhatWidget } from './widgets/WhoCarriesWhatWidget';
import { RecentReleasesWidget } from './widgets/RecentReleasesWidget';

const TIME_RANGE_OPTIONS = ['Last 30 days', 'Last 60 days', 'Last 90 days', 'Last 12 months'] as const;
type TimeRange = typeof TIME_RANGE_OPTIONS[number];

export function ProductDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('Last 30 days');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: token('elevation.surface', '#FFFFFF'),
      }}
    >
      {/* Page header */}
      <div
        style={{
          padding: `${token('space.200', '16px')} ${token('space.300', '24px')} ${token('space.150', '12px')}`,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            lineHeight: 1.4,
          }}
        >
          Product Dashboard
        </h1>
      </div>

      {/* Workflow path strip */}
      <div
        data-testid="workflow-path-region"
        style={{
          padding: `${token('space.100', '8px')} ${token('space.300', '24px')}`,
          flexShrink: 0,
        }}
      >
        <DashboardWorkflowPath />
      </div>

      {/* Filter bar */}
      <div
        data-testid="filter-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
          padding: `${token('space.075', '6px')} ${token('space.300', '24px')}`,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: token('color.text.subtle', '#505258'),
            marginRight: token('space.050', '4px'),
          }}
        >
          Filter:
        </span>

        <div data-testid="filter-trigger">
          <DropdownMenu
            trigger={timeRange}
            shouldRenderToParent
          >
            <DropdownItemGroup>
              {TIME_RANGE_OPTIONS.map(opt => (
                <DropdownItem
                  key={opt}
                  isSelected={opt === timeRange}
                  onClick={() => setTimeRange(opt)}
                >
                  {opt}
                </DropdownItem>
              ))}
            </DropdownItemGroup>
          </DropdownMenu>
        </div>
      </div>

      {/* Widget grid */}
      <div
        data-testid="widget-grid"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: token('space.300', '24px'),
          display: 'flex',
          flexDirection: 'column',
          gap: token('space.200', '16px'),
        }}
      >
        {/* Row 1: At a Glance (full width) */}
        <AtAGlanceWidget />

        {/* Row 2: Stage Overview (full width) */}
        <StageOverviewWidget onStageClick={() => {}} />

        {/* Row 3: Needs Attention + Active Interventions + Who Carries What */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: token('space.200', '16px'),
          }}
        >
          <NeedsAttentionWidget />
          <ActiveInterventionsWidget />
          <WhoCarriesWhatWidget />
          <RecentReleasesWidget />
        </div>
      </div>
    </div>
  );
}
