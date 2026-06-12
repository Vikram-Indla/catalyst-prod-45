/**
 * FilterRoadmapPage — filter-backed roadmap view.
 *
 * Route: /project-hub/:key/roadmaps/:id
 *   :key  — project key (e.g. BAU), used for breadcrumb navigation only
 *   :id   — filter_derived_views.id (UUID)
 *
 * Data flow:
 *   1. Load the filter_derived_views row via id (title + shared_default_config)
 *   2. Load the linked ph_saved_filters row to get jql_query
 *   3. Run jql_query through useFilterRoadmapGroups (useJqlResults → jqlRowsToRoadmapGroups)
 *   4. Render RoadmapTimeline with the resulting groups
 *
 * Flag gate: ENABLE_FILTER_TO_ROADMAP — renders a 404-style fallback when off.
 * (The kebab that creates the view is also gated, so this is a belt-and-suspenders guard.)
 *
 * NFR surfaces:
 *   • isLoading  → @atlaskit/spinner
 *   • isError    → @atlaskit/section-message (appearance="error")
 *   • isTruncated (totalCount > 100) → @atlaskit/section-message (appearance="warning")
 *   • empty (groups=[]) → empty-state message
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Button from '@atlaskit/button/new';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { RoadmapTimeline } from '@/components/catalyst-roadmap/RoadmapTimeline';
import { ENABLE_FILTER_TO_ROADMAP } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';
import {
  useFilterRoadmapGroups,
  type DateField,
  type LaneBy,
} from '@/components/catalyst-roadmap/adapters/filterRoadmapSource';
import type { TimesliceMode, TimelineConfig } from '@/types/roadmap';

// ── TimelineConfig helper ─────────────────────────────────────────────────────

function defaultTimelineConfig(): TimelineConfig {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);   // Jan 1 current year
  const end   = new Date(today.getFullYear() + 1, 11, 31); // Dec 31 next year
  return { start, end, today };
}

// ── Derived-view loader ───────────────────────────────────────────────────────

interface DerivedViewRow {
  id: string;
  title: string;
  source_filter_id: string;
  shared_default_config: {
    date_field?: string;
    lane_by?: string;
    zoom?: string;
  };
}

function useDerivedView(id: string | undefined) {
  return useQuery({
    queryKey: ['filter-derived-view', id],
    queryFn: async (): Promise<DerivedViewRow> => {
      const { data, error } = await (supabase as any)
        .from('filter_derived_views')
        .select('id, title, source_filter_id, shared_default_config')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as DerivedViewRow;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

interface FilterRow {
  id: string;
  jql_query: string;
}

function useSourceFilter(filterId: string | undefined) {
  return useQuery({
    queryKey: ['source-filter-jql', filterId],
    queryFn: async (): Promise<FilterRow> => {
      const { data, error } = await (supabase as any)
        .from('ph_saved_filters')
        .select('id, jql_query')
        .eq('id', filterId)
        .single();
      if (error) throw new Error(error.message);
      return data as FilterRow;
    },
    enabled: !!filterId,
    staleTime: 60_000,
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FilterRoadmapPage() {
  const { key, id } = useParams<{ key: string; id: string }>();
  const navigate = useNavigate();

  // Feature gate — belt-and-suspenders; the kebab is also gated
  if (!ENABLE_FILTER_TO_ROADMAP) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage appearance="warning" title="Feature unavailable">
          <p>This roadmap view is not available in your current environment.</p>
        </SectionMessage>
      </div>
    );
  }

  return <FilterRoadmapPageInner projectKey={key ?? ''} viewId={id ?? ''} navigate={navigate} />;
}

// ── Inner (rendered after feature gate passes) ────────────────────────────────

interface InnerProps {
  projectKey: string;
  viewId: string;
  navigate: ReturnType<typeof useNavigate>;
}

function FilterRoadmapPageInner({ projectKey, viewId, navigate }: InnerProps) {
  const viewQuery   = useDerivedView(viewId);
  const filterQuery = useSourceFilter(viewQuery.data?.source_filter_id);

  // Extract persisted config from the derived view row
  const config = viewQuery.data?.shared_default_config ?? {};
  const dateField = (config.date_field as DateField | undefined) ?? 'due_date';
  const laneBy    = (config.lane_by    as LaneBy   | undefined) ?? 'status';

  const jql = filterQuery.data?.jql_query;
  const roadmapQuery = useFilterRoadmapGroups(jql, { dateField, laneBy });

  // ── RoadmapTimeline local state ────────────────────────────────────────────
  const [slice, setSlice] = useState<TimesliceMode>(() => {
    const saved = config.zoom as TimesliceMode | undefined;
    return saved ?? 'monthly';
  });
  const [zoom, setZoom]       = useState(100);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected]   = useState<string | null>(null);
  const [editing, setEditing]     = useState<string | null>(null);
  const timelineConfig = useMemo(defaultTimelineConfig, []);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleSelect     = useCallback((id: string | null) => setSelected(id), []);
  const handleStartEdit  = useCallback((id: string) => setEditing(id), []);
  const handleFinishEdit = useCallback((_id: string, _name: string) => setEditing(null), []);
  const handleCancelEdit = useCallback(() => setEditing(null), []);
  const handleContextMenu = useCallback((_e: React.MouseEvent, _id: string) => {}, []);
  const handleShowTooltip = useCallback((_e: React.MouseEvent, _id: string) => {}, []);
  const handleHideTooltip = useCallback(() => {}, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (viewQuery.isLoading || filterQuery.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
        <Spinner size="medium" />
        <span style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: 14 }}>Loading roadmap…</span>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (viewQuery.isError || filterQuery.isError || roadmapQuery.isError) {
    const msg = (viewQuery.error ?? filterQuery.error ?? roadmapQuery.error) as Error | null;
    return (
      <div style={{ padding: 24 }}>
        <SectionMessage appearance="error" title="Could not load roadmap">
          <p>{msg?.message ?? 'An unexpected error occurred. Please try refreshing the page.'}</p>
        </SectionMessage>
      </div>
    );
  }

  const title = viewQuery.data?.title ?? 'Roadmap';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Page header — mirrors KanbanBoardPage structure */}
      <ProjectHeaderChip projectKey={projectKey} />
      <CatalystPageHeader
        title={title}
        actions={
          <Button
            appearance="subtle"
            onClick={() => navigate(`/project-hub/${projectKey}/filters`)}
          >
            ← Back to filters
          </Button>
        }
      />

      {/* Truncation banner — displayed BELOW header so it's visible but not blocking */}
      {roadmapQuery.isTruncated && (
        <div style={{ padding: '0 24px' }}>
          <SectionMessage appearance="warning" title="Showing first 100 results">
            <p>
              Your filter matched {roadmapQuery.totalCount} issues. Only the first 100 are displayed.
              Refine your filter to see a more focused view.
            </p>
          </SectionMessage>
        </div>
      )}

      {/* Empty state */}
      {!roadmapQuery.isLoading && roadmapQuery.groups.length === 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--ds-text-subtle, #42526E)',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500 }}>No issues to display</span>
          <span style={{ fontSize: 14 }}>
            The filter returned no results, or none of the matched issues have a{' '}
            {dateField === 'due_date' ? 'due date' : dateField === 'created' ? 'created date' : 'updated date'}.
          </span>
        </div>
      )}

      {/* Timeline — only rendered when there are groups */}
      {roadmapQuery.groups.length > 0 && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <RoadmapTimeline
            ref={timelineRef}
            groups={roadmapQuery.groups}
            deps={[]}
            collapsed={collapsed}
            selected={selected}
            editing={editing}
            slice={slice}
            zoom={zoom}
            timelineConfig={timelineConfig}
            onSelect={handleSelect}
            onStartEdit={handleStartEdit}
            onFinishEdit={handleFinishEdit}
            onCancelEdit={handleCancelEdit}
            onContextMenu={handleContextMenu}
            onShowTooltip={handleShowTooltip}
            onHideTooltip={handleHideTooltip}
          />
        </div>
      )}
    </div>
  );
}
