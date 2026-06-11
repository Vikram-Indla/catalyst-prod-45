import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import AkFlag, { FlagGroup } from '@atlaskit/flag';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkWarningIcon from '@atlaskit/icon/core/warning';
import AkInfoIcon from '@atlaskit/icon/core/information';
import Spinner from '@atlaskit/spinner';
import { AtlaskitPageShell } from '@/components/ads';
import {
  JiraTable,
  makeKeyCell,
  makeSummaryCell,
  makeStatusCell,
  makeParentCell,
  makeAssigneeCell,
} from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { jiraIconType, lozengeAppearance } from '@/components/universal-work-view/uwv.utils';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { resolveAvatarUrl } from '@/lib/avatars';
import { supabase } from '@/integrations/supabase/client';
import {
  FilterChip,
  FilterTriggerAndPopup,
  type FilterState,
  EMPTY_FILTERS,
  FACET_LABELS,
  MORE_FILTERS_FACETS,
  filterStateToJql,
  totalSelected,
  distinctOptions,
  type FacetOption,
} from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory as JiraFilterCategory } from '@/components/shared/JiraBasicFilter';
import type { WorkItem } from '@/types/workItem.types';
import FilterIconCore from '@atlaskit/icon/core/filter';

const SUBTLE = token('color.text.subtle', '#505258');
const FilterIcon = () => <FilterIconCore label="" color={SUBTLE} />;

function useProjectFacetItems(projectKey: string | undefined): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['filter-preview-facet-items', projectKey],
    enabled: !!projectKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('ph_issues')
        .select(
          'issue_key, issue_type, status, status_category, assignee_display_name, assignee_account_id, priority, fix_versions, labels, parent_key, parent_summary, sprint_name, resolution, severity'
        )
        .eq('project_key', projectKey)
        .is('jira_removed_at', null)
        .is('deleted_at', null)
        .limit(500);
      if (!rows) return [];
      return (rows as any[]).map(
        (r: any): WorkItem =>
          ({
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
          } as any)
      );
    },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Linked entities — scaffolded for future Kanban/board/widget wiring.
// When a saved filter gains dependents (Kanban board, Sprint board, gadget),
// this hook will return them and the impact Flag will show automatically.
// ---------------------------------------------------------------------------
export interface LinkedFilterEntity {
  type: string;   // e.g. "Kanban board", "Sprint board"
  name: string;
  href?: string;
}

function useLinkedEntities(_filterId: string | null): LinkedFilterEntity[] {
  // TODO: query ph_filter_dependents (or equivalent) when the schema exists.
  return [];
}

// ---------------------------------------------------------------------------

export function FilterPreviewPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Ask Caty inline bar — mirrors BacklogPage's setAskCatyOpen pattern
  const [askCatyOpen, setAskCatyOpen] = useState(false);

  // Save state — isDirty gates the Save button; savedFilterId drives override logic
  const [savedFilterId, setSavedFilterId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Atlaskit Flag notifications
  const [flags, setFlags] = useState<
    Array<{ id: string; type: 'override-warning' | 'impact-entities' }>
  >([]);
  const flagIdRef = useRef(0);
  const addFlag = useCallback((type: 'override-warning' | 'impact-entities') => {
    const id = `flag-${++flagIdRef.current}`;
    setFlags(prev => [...prev, { id, type }]);
    if (type !== 'override-warning') {
      setTimeout(() => setFlags(prev => prev.filter(f => f.id !== id)), 8000);
    }
  }, []);
  const dismissFlag = useCallback(
    (id: string) => setFlags(prev => prev.filter(f => f.id !== id)),
    []
  );

  const linkedEntities = useLinkedEntities(savedFilterId);
  const facetItems = useProjectFacetItems(projectKey);

  const facetOptions = useMemo(() => {
    const ALL_FACETS = ['workType', 'status', 'assignee', ...MORE_FILTERS_FACETS] as const;
    const out: Record<string, FacetOption[]> = {};
    for (const f of ALL_FACETS) out[f] = distinctOptions(facetItems, f as any);
    return out;
  }, [facetItems]);

  // filterStateToJql always produces at least `project = "BAU"` so the table
  // is never empty by default — same scope as the Project Backlog.
  const jql = useMemo(() => filterStateToJql(filters, projectKey), [filters, projectKey]);

  const { data, isLoading, isFetching } = useJqlResults(jql);

  const items = useMemo(() => {
    const rows = [...(data?.items ?? [])];
    const dir = sortOrder === 'ASC' ? 1 : -1;
    rows.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
      const vb = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      return rows.filter(r => r.summary.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
    }
    return rows;
  }, [data?.items, sortKey, sortOrder, search]);

  const totalCount = totalSelected(filters);
  const moreCount = MORE_FILTERS_FACETS.reduce((n, f) => n + filters[f].length, 0);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const updateFacet = (facet: string, next: string[]) => {
    setFilters(prev => ({ ...prev, [facet]: next }));
    markDirty();
  };

  const toggleValue = (facet: string, value: string) => {
    const cur = filters[facet as keyof FilterState];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    updateFacet(facet, next);
  };

  const openDetail = (key: string) =>
    useGlobalSearchStore.getState().openDetail({ id: key });

  const activeAssignees = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; name: string; avatarUrl: string | null }[] = [];
    for (const r of items) {
      if (!r.assigneeName || seen.has(r.assigneeName)) continue;
      seen.add(r.assigneeName);
      out.push({ id: r.assigneeName, name: r.assigneeName, avatarUrl: resolveAvatarUrl(r.assigneeName) });
    }
    return out.filter(a => a.avatarUrl);
  }, [items]);

  // ── Save handlers ──────────────────────────────────────────────────────────

  const handleSaveClick = () => {
    if (savedFilterId) {
      // Filter was previously saved — show override warning first
      addFlag('override-warning');
    } else {
      setSaveOpen(true);
    }
  };

  const handleConfirmOverride = useCallback(() => {
    // User confirmed the override — dismiss the warning flag and open modal
    setFlags(prev => prev.filter(f => f.type !== 'override-warning'));
    setSaveOpen(true);
  }, []);

  const handleSaved = useCallback(
    (id: string) => {
      setSaveOpen(false);
      setSavedFilterId(id);
      setIsDirty(false);
      if (linkedEntities.length > 0) addFlag('impact-entities');
      navigate(`/project-hub/${projectKey}/filters`);
    },
    [linkedEntities, addFlag, navigate, projectKey]
  );

  // ── Column definitions ─────────────────────────────────────────────────────

  const columns = useMemo<Column<JqlResultRow>[]>(() => {
    const keyFn = makeKeyCell(
      (r: JqlResultRow) => r.key,
      (r: JqlResultRow) => openDetail(r.key),
      undefined,
      (r: JqlResultRow) => <JiraIssueTypeIcon type={jiraIconType(r.issueType)} size={16} />,
    );
    const summaryFn = makeSummaryCell((r: JqlResultRow) => r.summary);

    return [
      {
        id: 'key',
        label: 'Work',
        flex: true,
        sortable: true,
        alwaysVisible: true,
        accessor: (r: JqlResultRow) => r.key,
        cell: function WorkCell(props: any) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
              {keyFn(props)}
              <span style={{ flex: 1, minWidth: 0 }}>{summaryFn(props)}</span>
            </span>
          );
        },
      },
      {
        id: 'parent',
        label: 'Parent',
        width: 11,
        sortable: false,
        accessor: (r: JqlResultRow) => r.parentKey ?? '',
        cell: makeParentCell((r: JqlResultRow) =>
          r.parentKey
            ? { key: r.parentKey, label: r.parentSummary ?? r.parentKey }
            : null
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 15,
        sortable: true,
        accessor: (r: JqlResultRow) => r.status,
        cell: makeStatusCell(
          (r: JqlResultRow) => r.status || null,
          s => lozengeAppearance('', s ?? '')
        ),
      },
      {
        id: 'assigneeName',
        label: 'Assignee',
        width: 11,
        sortable: true,
        accessor: (r: JqlResultRow) => r.assigneeName ?? '',
        cell: makeAssigneeCell((r: JqlResultRow) =>
          r.assigneeName
            ? { name: r.assigneeName, avatarUrl: resolveAvatarUrl(r.assigneeName) }
            : null
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AtlaskitPageShell
      flush
      chromeBand={
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 653,
            color: token('color.text', '#172B4D'),
            lineHeight: '24px',
          }}
        >
          Create filter
        </h1>
      }
    >
      {/* Ask Caty inline bar — replaces toolbar row when open (mirrors BacklogPage) */}
      {askCatyOpen && (
        <AskCatyInlineBar
          projectKey={projectKey ?? null}
          onClose={() => setAskCatyOpen(false)}
        />
      )}

      {/* Toolbar — hidden when Caty bar is open, same as BacklogPage pattern */}
      <div
        style={{
          display: askCatyOpen ? 'none' : 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '32px 24px',
          flexShrink: 0,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          flexWrap: 'nowrap',
          overflow: 'visible',
        }}
      >
        <AIIntelligenceButton
          label="Ask Caty"
          onClick={() => setAskCatyOpen(true)}
          tooltip="Ask Caty about these results"
        />

        <div style={{ flex: 1, minWidth: 240, maxWidth: 640 }}>
          <Textfield
            isCompact
            placeholder="Search list"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              markDirty();
            }}
            elemBeforeInput={
              <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                <AkSearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={
              search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#6B778C'), padding: '0 8px 0 4px' }}
                >
                  <AkCloseIcon label="" size="small" />
                </button>
              ) : undefined
            }
          />
        </div>

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
                  markDirty();
                }}
                onClose={() => setOpenChipKey(null)}
              />
            );
          }}
        />

        {totalCount > 0 && (
          <Button
            appearance="subtle"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              markDirty();
            }}
          >
            Clear filters
          </Button>
        )}

        {activeAssignees.length > 0 && (
          <AvatarGroup
            appearance="stack"
            size="small"
            maxCount={5}
            label="Assignees"
            data={activeAssignees.map(a => ({ key: a.id, name: a.name, src: a.avatarUrl ?? undefined }))}
          />
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 8px', color: token('color.text.subtlest', '#626F86'), fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {isFetching && <Spinner size="small" />}
          {!isFetching && data != null && `${data.totalCount} item${data.totalCount === 1 ? '' : 's'}`}
        </div>

        {/* Save button — disabled until user touches any filter or search */}
        <Button appearance="primary" isDisabled={!isDirty} onClick={handleSaveClick}>
          Save filter
        </Button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '24px' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <JiraTable<JqlResultRow>
              columns={columns}
              data={items}
              getRowId={r => r.id}
              onRowClick={r => openDetail(r.key)}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
              isLoading={isLoading}
              density="comfortable"
              ariaLabel="Filter preview"
              showRowCount
              totalRowCount={data?.totalCount}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              emptyView={
                <div style={{ padding: '32px 24px', textAlign: 'center', color: token('color.text.subtle'), fontSize: 14 }}>
                  No work items match this filter. Adjust the criteria above.
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* Save modal */}
      {saveOpen && (
        <FilterSaveModal
          filter={savedFilterId ? ({ id: savedFilterId } as any) : undefined}
          initialJql={jql}
          initialName={savedFilterId ? undefined : 'Untitled filter'}
          onClose={() => setSaveOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Atlaskit Flag notifications — override warning + impact alert */}
      <FlagGroup onDismissed={id => dismissFlag(id as string)}>
        {flags.map(flag => {
          if (flag.type === 'override-warning') {
            return (
              <AkFlag
                key={flag.id}
                id={flag.id}
                appearance="warning"
                icon={<AkWarningIcon label="Warning" color={token('color.icon.warning', '#974F0C')} />}
                title="Override existing filter?"
                description="You are about to save changes over the existing saved filter. This cannot be undone."
                actions={[
                  { content: 'Yes, override', onClick: handleConfirmOverride },
                  { content: 'Cancel', onClick: () => dismissFlag(flag.id) },
                ]}
              />
            );
          }
          if (flag.type === 'impact-entities') {
            return (
              <AkFlag
                key={flag.id}
                id={flag.id}
                appearance="info"
                icon={<AkInfoIcon label="Info" color={token('color.icon.information', '#1868DB')} />}
                title="Filter saved — linked views updated"
                description={
                  linkedEntities.length > 0
                    ? `This filter is used by: ${linkedEntities.map(e => `${e.type} "${e.name}"`).join(', ')}. Those views will reflect your changes.`
                    : 'Filter saved successfully.'
                }
                actions={[{ content: 'Dismiss', onClick: () => dismissFlag(flag.id) }]}
              />
            );
          }
          return null;
        })}
      </FlagGroup>
    </AtlaskitPageShell>
  );
}
