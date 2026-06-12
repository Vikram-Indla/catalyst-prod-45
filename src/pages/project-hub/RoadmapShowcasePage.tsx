/**
 * RoadmapShowcasePage — TEMPORARY
 *
 * Mounts every distinct roadmap implementation side-by-side so Vikram can
 * evaluate designs and select the best pattern for the filter-backed roadmap.
 *
 * Route: /project-hub/:key/roadmap-showcase
 * Remove this page + route + sidebar item once a pattern is selected.
 */
import React, { Suspense, lazy, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';

// ── Lazy imports — each variant in isolation ─────────────────────────────────

const CatalystRoadmapVariant   = lazy(() => import('./showcase-variants/CatalystRoadmapVariant'));
const RoadmapEngineVariant     = lazy(() => import('./showcase-variants/RoadmapEngineVariant'));
const ProductRoadmapV2Variant  = lazy(() => import('./showcase-variants/ProductRoadmapV2Variant'));
const ProgramRoadmapVariant    = lazy(() => import('./showcase-variants/ProgramRoadmapVariant'));
const PortfolioRoadmapVariant  = lazy(() => import('./showcase-variants/PortfolioRoadmapVariant'));
const TimelineViewVariant      = lazy(() => import('./showcase-variants/TimelineViewVariant'));
const PIRoadmapVariant         = lazy(() => import('./showcase-variants/PIRoadmapVariant'));
const IdeasKanbanVariant       = lazy(() => import('./showcase-variants/IdeasKanbanVariant'));
const ProductHubRoadmapVariant = lazy(() => import('./showcase-variants/ProductHubRoadmapVariant'));
const EpicRoadmapVariant       = lazy(() => import('./showcase-variants/EpicRoadmapVariant'));

// ── Tab definitions ──────────────────────────────────────────────────────────

const VARIANTS = [
  {
    id: 'catalyst-timeline',
    label: 'Catalyst Timeline',
    description: 'Gantt bars grouped by status/assignee/type. V1 — milestone-first. Currently wired to filter-backed roadmaps.',
    component: CatalystRoadmapVariant,
  },
  {
    id: 'roadmap-engine',
    label: 'Config-driven Engine',
    description: 'Generic RoadmapEngine with epicRoadmapConfig. Search + filters + multilingual + zoom. Used in Program Roadmaps test page.',
    component: RoadmapEngineVariant,
  },
  {
    id: 'product-roadmap-v2',
    label: 'Product Roadmap V2',
    description: 'Full-featured modular roadmap: drag & drop, List / Timeline / Swimlane view modes, filter dialog, export, detail panel.',
    component: ProductRoadmapV2Variant,
  },
  {
    id: 'program-roadmap',
    label: 'Program Roadmap',
    description: 'Gantt for program-level epics. Search, Group by, Filters, Today marker, linked features tooltip.',
    component: ProgramRoadmapVariant,
  },
  {
    id: 'portfolio-roadmap',
    label: 'Portfolio Roadmap',
    description: 'Quarter/month swimlane cards grouped by theme / program / epic. Health badges, progress bars.',
    component: PortfolioRoadmapVariant,
  },
  {
    id: 'timeline-view',
    label: 'Timeline / Gantt',
    description: 'Classic Gantt with sidebar, week/month/quarter zoom, dependency lines, and release markers.',
    component: TimelineViewVariant,
  },
  {
    id: 'pi-roadmap',
    label: 'PI Roadmap',
    description: 'PI filter sidebar + Work / PI / Release view tabs. Sprint bars, milestones, objectives. Used in Roadmaps page.',
    component: PIRoadmapVariant,
  },
  {
    id: 'ideas-kanban',
    label: 'Ideas Kanban',
    description: 'Quarter-column Kanban board (Uncommitted → Q1 → Q2 → Q3 → Q4). Drag & drop ideas between quarters.',
    component: IdeasKanbanVariant,
  },
  {
    id: 'product-hub-roadmap',
    label: 'Product Hub Roadmap',
    description: 'Business-request Gantt with KPI strip, request list panel, timeline bar, and detail side panel.',
    component: ProductHubRoadmapVariant,
  },
  {
    id: 'epic-roadmap',
    label: 'Epic Roadmap',
    description: 'Gantt specifically for epics. Timeline periods from enterprise-roadmap utils. Today marker, search, scale toggle.',
    component: EpicRoadmapVariant,
  },
] as const;

type VariantId = typeof VARIANTS[number]['id'];

// ── Loading fallback ─────────────────────────────────────────────────────────

function VariantLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
      <Spinner size="medium" />
      <span style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: 14 }}>Loading variant…</span>
    </div>
  );
}

// ── Error boundary for variants that crash on missing data ───────────────────

class VariantErrorBoundary extends React.Component<
  { children: React.ReactNode; name: string },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode; name: string }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: 'var(--ds-text-subtle, #42526E)' }}>
          <strong style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{this.props.name}</strong>
          <p style={{ marginTop: 8, fontSize: 13 }}>
            This variant requires external data that is not available in showcase mode.
          </p>
          <p style={{ marginTop: 4, fontSize: 12, fontFamily: 'var(--ds-font-family-code, monospace)' }}>
            {this.state.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapShowcasePage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [active, setActive] = useState<VariantId>('catalyst-timeline');

  const current = VARIANTS.find(v => v.id === active)!;
  const Variant = current.component;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <CatalystPageHeader
        title="Roadmap Showcase — pick a pattern"
        actions={
          <Button
            appearance="subtle"
            onClick={() => navigate(`/project-hub/${projectKey}/filters`)}
          >
            ← Back to filters
          </Button>
        }
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* ── Left tab rail ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: `1px solid var(--ds-border, #DFE1E6)`,
            overflowY: 'auto',
            padding: '8px 0',
            background: 'var(--ds-surface-sunken, #F7F8F9)',
          }}
        >
          {VARIANTS.map(v => (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: active === v.id ? 600 : 400,
                color: active === v.id
                  ? 'var(--ds-link, #0052CC)'
                  : 'var(--ds-text, #172B4D)',
                background: active === v.id
                  ? 'var(--ds-background-selected, #E9F2FE)'
                  : 'transparent',
                border: 'none',
                borderLeft: active === v.id
                  ? '3px solid var(--ds-link, #0052CC)'
                  : '3px solid transparent',
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Right: description + variant ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Description strip */}
          <div
            style={{
              padding: '8px 16px',
              borderBottom: `1px solid var(--ds-border, #DFE1E6)`,
              background: 'var(--ds-surface, #FFFFFF)',
              fontSize: 13,
              color: 'var(--ds-text-subtle, #42526E)',
              flexShrink: 0,
            }}
          >
            <strong style={{ color: 'var(--ds-text, #172B4D)' }}>{current.label}</strong>
            {' — '}
            {current.description}
          </div>

          {/* Variant mount */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VariantErrorBoundary name={current.label}>
              <Suspense fallback={<VariantLoader />}>
                <Variant projectKey={projectKey ?? 'BAU'} />
              </Suspense>
            </VariantErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
