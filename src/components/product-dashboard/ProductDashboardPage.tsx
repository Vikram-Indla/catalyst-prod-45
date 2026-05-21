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

function AkBtn({
  children,
  primary,
}: {
  children: React.ReactNode;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 4,
        border: primary
          ? `1px solid ${token('color.link', '#0C66E4')}`
          : `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
        background: primary
          ? hover ? 'var(--cp-primary-60, #0052CC)' : token('color.link', '#0C66E4')
          : hover ? token('color.background.neutral.hovered', '#F1F2F4') : token('elevation.surface', '#FFFFFF'),
        fontSize: 14,
        fontWeight: 500,
        color: primary ? '#FFFFFF' : token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export function ProductDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('Last 90 days');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: token('elevation.surface.sunken', '#F7F8F9'),
      }}
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header
        style={{
          background: token('elevation.surface', '#FFFFFF'),
          borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
            }}
          >
            <span>Projects</span>
            <span style={{ color: token('color.text.subtlest', '#8993A4') }}>/</span>
            <span>Product</span>
            <span style={{ color: token('color.text.subtlest', '#8993A4') }}>/</span>
            <span>Dashboard</span>
          </div>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: 20,
              fontWeight: 600,
              color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
              lineHeight: '24px',
            }}
          >
            Product Dashboard
          </h1>
          <div
            style={{
              fontSize: 11,
              color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
              marginTop: 2,
            }}
          >
            Senaei Demand · 11-stage process
          </div>
        </div>

        {/* filter-bar lives in the header — testid preserved */}
        <div
          data-testid="filter-bar"
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <div data-testid="filter-trigger">
            <DropdownMenu
              trigger={`📅 ${timeRange} ▾`}
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

          <AkBtn>✎ Edit</AkBtn>
          <AkBtn primary>+ Create</AkBtn>
        </div>
      </header>

      {/* ── Workflow path strip ──────────────────────────────────────────── */}
      <div
        data-testid="workflow-path-region"
        style={{
          padding: '8px 32px',
          borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          flexShrink: 0,
          background: token('elevation.surface', '#FFFFFF'),
        }}
      >
        <DashboardWorkflowPath />
      </div>

      {/* ── Widget scroll area ───────────────────────────────────────────── */}
      <div
        data-testid="widget-grid"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px 64px',
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <AtAGlanceWidget />
          <StageOverviewWidget onStageClick={() => {}} />
          <NeedsAttentionWidget />
          <ActiveInterventionsWidget />
          <RecentReleasesWidget />
          <WhoCarriesWhatWidget />
        </div>
      </div>
    </div>
  );
}
