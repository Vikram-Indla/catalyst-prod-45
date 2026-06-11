import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import { AtlaskitPageShell } from '@/components/ads';
import { FilterResultsPanel } from '@/components/filters/FilterResultsPanel';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import {
  FilterChip,
  FilterTriggerAndPopup,
  FilterState,
  EMPTY_FILTERS,
  FACET_LABELS,
  MORE_FILTERS_FACETS,
  filterStateToJql,
  totalSelected,
  distinctOptions,
  FacetOption,
} from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory as JiraFilterCategory } from '@/components/shared/JiraBasicFilter';
import type { WorkItem } from '@/types/workItem.types';
import { supabase } from '@/integrations/supabase/client';
import FilterIconCore from '@atlaskit/icon/core/filter';

const SUBTLE = 'var(--ds-text-subtle, #505258)';
const FilterIcon = () => <FilterIconCore label="" color={SUBTLE} />;

/** Lightweight query — fetches just the columns needed to build facet options. */
function useProjectFacetItems(projectKey: string | undefined): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['filter-preview-facet-items', projectKey],
    enabled: !!projectKey,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('ph_issues')
        .select(
          'issue_key, issue_type, status, status_category, assignee_display_name, assignee_account_id, priority, fix_versions, labels, parent_key, parent_summary, sprint_name, resolution, severity',
        )
        .eq('project_key', projectKey)
        .limit(500);
      if (!rows) return [];
      return (rows as any[]).map((r: any): WorkItem => ({
        id: r.issue_key,
        projectId: projectKey!,
        parentId: null,
        parentKey: r.parent_key ?? null,
        parentSummary: r.parent_summary ?? null,
        jiraKey: r.issue_key,
        type: 'task' as any,
        rawType: r.issue_type ?? null,
        summary: '',
        status: 'todo' as any,
        statusName: r.status ?? '',
        statusCategory: (r.status_category ?? 'todo') as any,
        assigneeId: r.assignee_account_id ?? null,
        assignee: r.assignee_display_name
          ? { id: r.assignee_account_id ?? '', name: r.assignee_display_name, avatarUrl: null, initials: '', color: '' }
          : undefined,
        reporterId: null,
        priority: (r.priority ?? 'medium') as any,
        fixVersion: r.fix_versions?.[0] ?? null,
        sprintRelease: r.fix_versions?.[0] ?? null,
        sprintName: r.sprint_name ?? null,
        labels: r.labels ?? [],
        resolution: r.resolution ?? null,
        severity: r.severity ?? null,
        commentsCount: 0,
        childCount: 0,
        createdAt: '',
        updatedAt: '',
        createdBy: null,
      } as any));
    },
  });
  return data;
}

export function FilterPreviewPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [filterName, setFilterName] = useState('Untitled filter');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);

  const facetItems = useProjectFacetItems(projectKey);

  const facetOptions = useMemo(() => {
    const ALL_FACETS = ['workType', 'status', 'assignee', ...MORE_FILTERS_FACETS] as const;
    const out: Record<string, FacetOption[]> = {};
    for (const f of ALL_FACETS) out[f] = distinctOptions(facetItems, f as any);
    return out;
  }, [facetItems]);

  const jql = useMemo(
    () => filterStateToJql(filters, projectKey),
    [filters, projectKey],
  );

  const totalCount = totalSelected(filters);

  const updateFacet = (facet: string, next: string[]) => {
    setFilters(prev => ({ ...prev, [facet]: next }));
  };

  const toggleValue = (facet: string, value: string) => {
    const cur = filters[facet as keyof FilterState];
    const next = cur.includes(value)
      ? cur.filter(v => v !== value)
      : [...cur, value];
    updateFacet(facet, next);
  };

  const moreCount = MORE_FILTERS_FACETS.reduce((n, f) => n + filters[f].length, 0);

  return (
    <AtlaskitPageShell
      flush
      cardPadding={{ x: 24, y: 16 }}
      cardBorder={`1px solid ${token('color.border', '#DFE1E6')}`}
      chromeBand={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 653,
              color: token('color.text', '#172B4D'),
              lineHeight: '28px',
            }}
          >
            {filterName}
          </h1>
        </div>
      }
    >
      {/* Filter chip toolbar — mirrors AllWorkToolbar chip bar, without AskCaty / search / avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <FilterChip
          label={FACET_LABELS.workType}
          facet="workType"
          options={facetOptions.workType ?? []}
          selected={filters.workType}
          onToggle={v => toggleValue('workType', v)}
          onClear={() => updateFacet('workType', [])}
          isOpen={openChipKey === 'workType'}
          onOpenChange={open => setOpenChipKey(open ? 'workType' : null)}
          headline="Type = (equals)"
        />
        <FilterChip
          label={FACET_LABELS.status}
          facet="status"
          options={facetOptions.status ?? []}
          selected={filters.status}
          onToggle={v => toggleValue('status', v)}
          onClear={() => updateFacet('status', [])}
          isOpen={openChipKey === 'status'}
          onOpenChange={open => setOpenChipKey(open ? 'status' : null)}
          headline="Status = (equals)"
        />
        <FilterChip
          label={FACET_LABELS.assignee}
          facet="assignee"
          options={facetOptions.assignee ?? []}
          selected={filters.assignee}
          onToggle={v => toggleValue('assignee', v)}
          onClear={() => updateFacet('assignee', [])}
          isOpen={openChipKey === 'assignee'}
          onOpenChange={open => setOpenChipKey(open ? 'assignee' : null)}
          headline="Assignee = (equals)"
        />
        <FilterTriggerAndPopup
          triggerLabel={`More filters${moreCount > 0 ? ` (${moreCount})` : ''}`}
          isOpen={openChipKey === 'more'}
          onOpenChange={open => setOpenChipKey(open ? 'more' : null)}
          FilterIcon={FilterIcon}
          renderContent={() => {
            const categories: JiraFilterCategory[] = MORE_FILTERS_FACETS.map(f => ({
              id: f,
              label: FACET_LABELS[f],
              options: (facetOptions[f] ?? []).map(o => ({ id: o.value, label: o.label })),
            }));
            const selected: Record<string, string[]> = {};
            for (const f of MORE_FILTERS_FACETS) selected[f] = filters[f];
            return (
              <JiraBasicFilter
                categories={categories}
                selected={selected}
                onSelectionChange={(categoryId, optionIds) => updateFacet(categoryId, optionIds)}
                onClearAll={() => {
                  const next = { ...filters };
                  for (const f of MORE_FILTERS_FACETS) next[f] = [];
                  setFilters(next);
                }}
                onClose={() => setOpenChipKey(null)}
              />
            );
          }}
        />

        {totalCount > 0 && (
          <Button
            appearance="subtle"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear filters
          </Button>
        )}

        {/* Save filter — right-aligned */}
        <div style={{ marginLeft: 'auto' }}>
          <Button
            appearance="primary"
            onClick={() => setSaveOpen(true)}
          >
            Save filter
          </Button>
        </div>
      </div>

      {/* Results table — canonical FilterResultsPanel, zero changes */}
      <FilterResultsPanel
        jql={jql}
        emptyHint="Select filters above — matching work items appear here."
      />

      {saveOpen && (
        <FilterSaveModal
          initialName={filterName}
          initialJql={jql}
          onClose={() => setSaveOpen(false)}
          onSaved={() => {
            setSaveOpen(false);
            if (projectKey) navigate(`/project-hub/${projectKey}/filters`);
          }}
        />
      )}
    </AtlaskitPageShell>
  );
}
