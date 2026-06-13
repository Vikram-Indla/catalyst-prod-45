/**
 * ProductFilterPreviewPage — /product-hub/:key/filters/create
 *
 * Mirror of FilterPreviewPage (/project-hub/:key/filters/create) for Product Hub.
 *
 * Differences from the project-hub source:
 *  1. Data source: business_requests (not ph_issues via JQL)
 *  2. Filtering: client-side (no JQL engine for BRs) — Basic mode only
 *  3. Facet pool: built from business_requests fields (request_type→labels, process_step→status, urgency→priority, planned_quarter→sprintRelease)
 *  4. Save navigation: /product-hub/:key/filters (not /project-hub/:key/filters)
 *  5. Save modal: productKey={key} instead of projectKey (hub_scope = 'product')
 *  6. JQL mode removed (no BR JQL engine)
 *
 * Everything else is verbatim identical to FilterPreviewPage: same columns,
 * same JiraTable props, same toolbar chrome, same flag notifications, same
 * column-visibility/widths localStorage pattern.
 */
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import AkFlag, { FlagGroup } from '@atlaskit/flag';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkInfoIcon from '@atlaskit/icon/core/information';
import Spinner from '@atlaskit/spinner';
import { AtlaskitPageShell } from '@/components/ads';
import {
  JiraTable,
  makeKeyCell,
  makeSummaryInlineEditCell,
  makeStatusEditCell,
  makeParentEditCell,
  makeAssigneeEditCell,
  makeAssigneeCell,
  makeDateCell,
  makeDateEditCell,
  makeRowMenuCell,
  makePriorityEditCell,
  makeLabelsEditCell,
  makeCommentsCell,
  makeSprintReleaseCell,
} from '@/components/shared/JiraTable';
import type { Column, SortOrder, LozengeAppearance } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { FilterKebabMenu } from '@/components/filters/FilterKebabMenu';
import { useUpdateSavedFilter } from '@/hooks/workhub/useSavedFilters';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { resolveAvatarUrl } from '@/lib/avatars';
import { supabase } from '@/integrations/supabase/client';
import {
  FilterChip,
  FilterTriggerAndPopup,
  type FilterState,
  type FilterFacet,
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

// ── Status appearances for BR process_step values ───────────────────────────

const ALL_FILTER_STATUSES = [
  'New', 'In Review', 'Approved', 'In Progress', 'On Hold',
  'Done', 'Rejected', 'Cancelled', 'Backlog', 'Ready for Development',
];

function filterStatusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'done' || s === 'approved' || s === 'closed') return 'success';
  if (s.includes('progress') || s.includes('review') || s.includes('development')) return 'inprogress';
  if (s === 'rejected' || s === 'cancelled') return 'removed';
  if (s === 'on hold') return 'moved';
  return 'default';
}

// ── Product lookup — resolves product_id from URL :key (code) ───────────────

function useProductByCode(code: string | undefined): { id: string | null; name: string } {
  const { data } = useQuery({
    queryKey: ['product-by-code', code],
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name')
        .eq('code', code!.toUpperCase())
        .maybeSingle();
      return data as { id: string; name: string } | null;
    },
  });
  return { id: data?.id ?? null, name: data?.name ?? code ?? '' };
}

// ── BR → JqlResultRow mapper ─────────────────────────────────────────────────

function mapBrToJqlRow(r: any, profileMap: Record<string, string>): JqlResultRow {
  return {
    id: r.id,
    key: r.request_key ?? r.id,
    summary: r.title ?? '',
    issueType: 'Business Request',
    status: r.process_step ?? 'New',
    statusCategory: r.process_step === 'Done' || r.process_step === 'Approved' ? 'done' : 'in_progress',
    projectKey: '',
    assigneeName: r.po_user_id ? (profileMap[r.po_user_id] ?? null) : null,
    priority: r.urgency ?? null,
    created: r.created_at ?? null,
    updated: r.updated_at ?? null,
    dueDate: r.end_date ?? null,
    parentKey: null,
    parentSummary: null,
    sprintName: null,
    isFlagged: null,
    flagReason: null,
    // Extra fields accessed by columns (not in JqlResultRow interface, safe at runtime)
    ...({
      sprintRelease: Array.isArray(r.planned_quarter) ? r.planned_quarter : [],
      labels: r.request_type ? [r.request_type] : [],
      commentCount: 0,
      reporterName: r.created_by ? (profileMap[r.created_by] ?? null) : null,
    } as any),
  };
}

// ── Facet items hook — builds WorkItem pool from business_requests ────────────
// Verified columns: id, request_key, title, process_step, urgency, po_user_id,
// project_manager_user_id, created_by, request_type, planned_quarter, end_date,
// created_at, updated_at, product_id, deleted_at (no 'assignee' column)

function useProductBrFacetItems(productId: string | null): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['product-filter-facet-items', productId],
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, process_step, urgency, po_user_id, created_by, request_type, planned_quarter, created_at, updated_at')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .limit(2000);
      if (!rows) return [];

      const userIds = [...new Set((rows as any[]).flatMap((r: any) => [r.po_user_id, r.created_by].filter(Boolean)))];
      const profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds as string[]);
        (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
      }

      return (rows as any[]).map((r: any): WorkItem => ({
        id: r.id,
        projectId: '',
        parentId: null,
        parentKey: null,
        parentSummary: null,
        jiraKey: r.request_key ?? r.id,
        type: 'task' as any,
        rawType: 'Business Request',
        summary: r.title ?? '',
        status: 'todo' as any,
        statusName: r.process_step ?? '',
        statusCategory: 'todo' as any,
        assigneeId: r.po_user_id ?? null,
        assignee: r.po_user_id && profileMap[r.po_user_id]
          ? { id: r.po_user_id, name: profileMap[r.po_user_id], avatarUrl: null, initials: '', color: '' }
          : undefined,
        reporterId: r.created_by ?? null,
        reporter: r.created_by && profileMap[r.created_by]
          ? { id: r.created_by, name: profileMap[r.created_by], avatarUrl: null, initials: '', color: '' }
          : undefined,
        priority: (r.urgency ?? 'medium') as any,
        fixVersion: null,
        sprintRelease: Array.isArray(r.planned_quarter) && r.planned_quarter.length > 0
          ? r.planned_quarter[0]
          : null,
        sprintName: null,
        labels: r.request_type ? [r.request_type] : [],
        resolution: null,
        severity: null,
        commentsCount: 0,
        childCount: 0,
        createdAt: r.created_at ?? '',
        updatedAt: r.updated_at ?? '',
        createdBy: null,
      } as any));
    },
  });
  return data;
}

// ── BR results hook — fetches + filters business_requests ────────────────────

function useProductBrResults(productId: string | null, filters: FilterState, search: string) {
  return useQuery({
    queryKey: ['product-br-results', productId, JSON.stringify(filters), search],
    enabled: !!productId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, process_step, urgency, po_user_id, created_by, request_type, planned_quarter, end_date, created_at, updated_at')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (!rows) return { items: [], totalCount: 0 };

      const userIds = [...new Set(
        (rows as any[]).flatMap((r: any) => [r.po_user_id, r.created_by].filter(Boolean))
      )];
      const profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds as string[]);
        (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
      }

      let items: JqlResultRow[] = (rows as any[]).map(r => mapBrToJqlRow(r, profileMap));

      // Client-side filter by FilterState
      if (filters.assignee.length > 0) {
        items = items.filter(r => r.assigneeName && filters.assignee.includes(r.assigneeName));
      }
      if (filters.status.length > 0) {
        items = items.filter(r => filters.status.includes(r.status));
      }
      if (filters.workType.length > 0) {
        const labels = (r: any) => (r as any).labels as string[];
        items = items.filter(r => filters.workType.some(t => labels(r).includes(t)));
      }
      if (filters.priority.length > 0) {
        items = items.filter(r => r.priority && filters.priority.includes(r.priority));
      }
      if (filters.labels.length > 0) {
        items = items.filter(r => {
          const rLabels = (r as any).labels as string[];
          return filters.labels.some(l => rLabels.includes(l));
        });
      }
      if (filters.sprintReleases.length > 0) {
        items = items.filter(r => {
          const sr = (r as any).sprintRelease as string[];
          return Array.isArray(sr) && filters.sprintReleases.some(v => sr.includes(v));
        });
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        items = items.filter(r => r.summary.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
      }

      return { items, totalCount: items.length };
    },
  });
}

// ── Linked entities (scaffold — same as FilterPreviewPage) ───────────────────

export interface LinkedFilterEntity { type: string; name: string; href?: string; }
function useLinkedEntities(_filterId: string | null): LinkedFilterEntity[] { return []; }

// ── JQL→FilterState parser (same as FilterPreviewPage — for loading saved filters) ──

const JQL_FIELD_TO_FACET: Record<string, FilterFacet> = {
  assignee: 'assignee',
  reporter: 'reporter',
  status: 'status',
  priority: 'priority',
  issuetype: 'workType',
  labels: 'labels',
  fixVersion: 'sprintReleases',
  parent: 'parent',
  resolution: 'resolution',
  sprint: 'sprint',
  storyPoints: 'storyPoints',
  'cf[10125]': 'severity',
};

function jqlToFilterState(jql: string): Partial<FilterState> {
  const result: Partial<FilterState> = {};
  const inRe = /(\S+)\s+in\s+\(([^)]+)\)/g;
  const eqRe = /(\S+)\s+=\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = inRe.exec(jql)) !== null) {
    const facet = JQL_FIELD_TO_FACET[m[1]];
    if (!facet) continue;
    const vals = [...m[2].matchAll(/"([^"]+)"/g)].map(v => v[1]);
    if (vals.length) result[facet] = vals;
  }
  while ((m = eqRe.exec(jql)) !== null) {
    if (m[1] === 'project') continue;
    const facet = JQL_FIELD_TO_FACET[m[1]];
    if (!facet || result[facet]) continue;
    result[facet] = [m[2]];
  }
  return result;
}

// ── Page component ─────────────────────────────────────────────────────────────

export function ProductFilterPreviewPage() {
  const { key: productCode } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFilterId = searchParams.get('filterId');

  const { id: productId, name: productName } = useProductByCode(productCode);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [savedFilterJql, setSavedFilterJql] = useState<string | null>(null);
  const [savedFilterName, setSavedFilterName] = useState<string | null>(null);
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['key', 'status', 'assignee', 'priority'])
  );

  const COL_WIDTHS_KEY = `ph-product-filter-col-widths-v1:${productCode}`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => { try { const r = localStorage.getItem(COL_WIDTHS_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } }
  );
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [askCatyOpen, setAskCatyOpen] = useState(false);

  // JC-1: Basic/JQL mode toggle (mirrors FilterPreviewPage — JQL mode shows derived JQL, no engine)
  const [filterMode, setFilterMode] = useState<'basic' | 'jql'>('basic');
  const [jqlText, setJqlText] = useState('');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const [savedFilterId, setSavedFilterId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const updateFilter = useUpdateSavedFilter();

  const [flags, setFlags] = useState<Array<{ id: string; type: 'save-success' | 'impact-entities' }>>([]);
  const flagIdRef = useRef(0);
  const addFlag = useCallback((type: 'save-success' | 'impact-entities') => {
    const id = `flag-${++flagIdRef.current}`;
    setFlags(prev => [...prev, { id, type }]);
    setTimeout(() => setFlags(prev => prev.filter(f => f.id !== id)), 8000);
  }, []);
  const dismissFlag = useCallback((id: string) => setFlags(prev => prev.filter(f => f.id !== id)), []);

  const linkedEntities = useLinkedEntities(savedFilterId);
  const facetItems = useProductBrFacetItems(productId);

  // Load saved filter when navigated with ?filterId=
  const { data: loadedFilter } = useQuery({
    queryKey: ['ph_saved_filter', urlFilterId],
    enabled: !!urlFilterId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_saved_filters')
        .select('id, name, jql_query, filter_config, user_id, owner_id, subscriber_ids, viewers_config, editors_config, used_by_board_ids, is_shared, page, created_at, updated_at, hub_scope, health_status, description, starred_by_user_ids, last_used_at, use_count')
        .eq('id', urlFilterId!)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (!loadedFilter) return;
    setSavedFilterId(loadedFilter.id);
    setSavedFilterName(loadedFilter.name ?? null);
    setSavedFilterJql(loadedFilter.jql_query ?? null);
    const cfg = loadedFilter.filter_config;
    if (cfg && typeof cfg === 'object' && ('workType' in cfg || 'status' in cfg || 'assignee' in cfg)) {
      setFilters({ ...EMPTY_FILTERS, ...(cfg as Partial<FilterState>) });
    } else if (loadedFilter.jql_query) {
      const parsed = jqlToFilterState(loadedFilter.jql_query);
      if (Object.keys(parsed).length > 0) setFilters({ ...EMPTY_FILTERS, ...parsed });
    }
  }, [loadedFilter]);

  const switchToJql = useCallback(() => {
    const current = savedFilterJql ?? filterStateToJql(filters, productCode);
    setJqlText(current);
    setFilterMode('jql');
  }, [savedFilterJql, filters, productCode]);

  const switchToBasic = useCallback(() => {
    const parsed = jqlToFilterState(jqlText);
    if (Object.keys(parsed).length > 0) {
      setFilters({ ...EMPTY_FILTERS, ...parsed });
      setSavedFilterJql(null);
    } else if (jqlText.trim()) {
      setSavedFilterJql(jqlText.trim());
    }
    setFilterMode('basic');
  }, [jqlText]);

  // Derive members from facet items (unique assignees — no extra query needed)
  const productMembers = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; name: string; src: string | null }[] = [];
    for (const item of facetItems) {
      const key = item.assigneeId ?? item.assignee?.name;
      if (item.assignee?.name && key && !seen.has(key)) {
        seen.add(key);
        out.push({ id: item.assignee.name, name: item.assignee.name, src: item.assignee.avatarUrl });
      }
    }
    return out;
  }, [facetItems]);

  const avatarData = productMembers.map((m) => ({
    key: m.id,
    name: m.name,
    src: resolveAvatarUrl(m.src ?? null) ?? undefined,
  }));

  const facetOptions = useMemo(() => {
    const ALL_FACETS = ['workType', 'status', 'assignee', ...MORE_FILTERS_FACETS] as const;
    const out: Record<string, FacetOption[]> = {};
    for (const f of ALL_FACETS) out[f] = distinctOptions(facetItems, f as any);
    return out;
  }, [facetItems]);

  const { data, isLoading, isFetching } = useProductBrResults(productId, filters, search);

  const items = useMemo(() => {
    const rows = [...(data?.items ?? [])];
    const dir = sortOrder === 'ASC' ? 1 : -1;
    rows.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
      const vb = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
    return rows;
  }, [data?.items, sortKey, sortOrder]);

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

  // ── Save handlers ──────────────────────────────────────────────────────────

  // Derived JQL from current filter state (used for saving — same as FilterPreviewPage)
  const jql = useMemo(() => {
    return savedFilterJql ?? filterStateToJql(filters, productCode);
  }, [savedFilterJql, filters, productCode]);

  const handleSaveClick = () => {
    if (savedFilterId) {
      updateFilter.mutate(
        { id: savedFilterId, updates: { jql_query: jql.trim() || null, filter_config: filters } },
        {
          onSuccess: () => {
            setIsDirty(false);
            addFlag('save-success');
          },
        }
      );
    } else {
      setSaveOpen(true);
    }
  };

  const handleSaved = useCallback(
    (id: string) => {
      setSaveOpen(false);
      setSaveAsOpen(false);
      setSavedFilterId(id);
      setIsDirty(false);
      if (linkedEntities.length > 0) addFlag('impact-entities');
      navigate(`/product-hub/${productCode}/filters`);
    },
    [linkedEntities, addFlag, navigate, productCode]
  );

  // ── Column definitions — verbatim from FilterPreviewPage (same JqlResultRow type) ──

  const columns = useMemo<Column<JqlResultRow>[]>(() => {
    const keyCellRenderer = makeKeyCell(
      (r: JqlResultRow) => r.key,
      (r: JqlResultRow) => openDetail(r.key),
      undefined,
      (r: JqlResultRow) => r.issueType
        ? <JiraIssueTypeIcon type={r.issueType} size={16} />
        : undefined,
    );
    const summaryCellRenderer = makeSummaryInlineEditCell<JqlResultRow>({
      getSummary: (r) => r.summary,
      canEdit: () => false,
      onChange: () => {},
    });

    return [
      {
        id: 'key',
        label: 'Work',
        flex: true,
        sortable: true,
        alwaysVisible: true,
        defaultVisible: true,
        accessor: (r) => r.key,
        cell: function WorkCell(props: any) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
              {keyCellRenderer(props)}
              <span style={{ flex: 1, minWidth: 0 }}>{summaryCellRenderer(props)}</span>
            </span>
          );
        },
      },
      {
        id: 'status',
        label: 'Status',
        width: 15,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.status,
        cell: makeStatusEditCell<JqlResultRow>({
          getStatus: (r) => r.status,
          options: ALL_FILTER_STATUSES,
          appearanceFor: (s) => filterStatusAppearance(s) as LozengeAppearance,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 11,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.assigneeName ?? '',
        cell: makeAssigneeEditCell<JqlResultRow>({
          getAssignee: (r) => r.assigneeName
            ? { id: r.assigneeName, name: r.assigneeName, avatarUrl: resolveAvatarUrl(r.assigneeName) }
            : null,
          options: [],
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'priority',
        label: 'Priority',
        width: 6,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.priority ?? '',
        cell: makePriorityEditCell<JqlResultRow>({
          getPriority: (r) => r.priority,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'sprint_release',
        label: 'Quarter/Release',
        width: 18,
        sortable: false,
        defaultVisible: true,
        accessor: (r) => ((r as any).sprintRelease || []).join(', '),
        cell: makeSprintReleaseCell((r: JqlResultRow) => (r as any).sprintRelease),
      },
      {
        id: 'labels',
        label: 'Type',
        width: 10,
        sortable: false,
        defaultVisible: true,
        accessor: (r) => ((r as any).labels || []).join(', '),
        cell: makeLabelsEditCell<JqlResultRow>({
          getLabels: (r) => (r as any).labels,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'due_date',
        label: 'Target date',
        width: 8,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.dueDate ?? '',
        cell: makeDateEditCell<JqlResultRow>({
          getDate: (r) => r.dueDate,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'created',
        label: 'Created',
        width: 8,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.created ?? '',
        cell: makeDateCell((r: JqlResultRow) => r.created),
      },
      {
        id: 'updated',
        label: 'Updated',
        width: 8,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.updated ?? '',
        cell: makeDateCell((r: JqlResultRow) => r.updated),
      },
      {
        id: 'reporter',
        label: 'Created by',
        width: 10,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => (r as any).reporterName ?? '',
        cell: makeAssigneeCell((r: JqlResultRow) => {
          const name = (r as any).reporterName as string | null;
          return name ? { name, avatarUrl: resolveAvatarUrl(name) ?? null } : null;
        }),
      },
      {
        id: '__actions',
        label: '',
        width: 5,
        sortable: false,
        alwaysVisible: true,
        cell: makeRowMenuCell({
          onOpen: (r: JqlResultRow) => openDetail(r.key),
        }),
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
            fontSize: 24,
            fontWeight: 653,
            color: token('color.text', '#172B4D'),
            lineHeight: '28px',
          }}
        >
          {savedFilterName ?? 'Create filter'}
        </h1>
      }
    >
      {/* Ask Caty inline bar */}
      {askCatyOpen && (
        <AskCatyInlineBar
          projectKey={productCode ?? null}
          onClose={() => setAskCatyOpen(false)}
          onJqlGenerated={(generatedJql) => {
            setSavedFilterJql(generatedJql);
            markDirty();
          }}
        />
      )}

      {/* Toolbar */}
      <div
        style={{
          display: askCatyOpen ? 'none' : 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}
      >
        {/* Row 1: Ask Caty · search · chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', flexWrap: 'nowrap', overflow: 'visible' }}>
          <AIIntelligenceButton
            label="Ask Caty"
            onClick={() => setAskCatyOpen(true)}
            tooltip="Ask Caty about these results"
          />

          {/* JC-1: Basic / JQL toggle — mirrors FilterPreviewPage */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={switchToBasic}
              style={{
                height: 32, padding: '0 8px', fontSize: 14,
                fontWeight: filterMode === 'basic' ? 600 : 400,
                border: `1px solid ${filterMode === 'basic' ? token('color.border.focused', '#388BFF') : token('color.border', '#DFE1E6')}`,
                borderRight: filterMode === 'basic' ? `1px solid ${token('color.border.focused', '#388BFF')}` : 'none',
                borderRadius: '3px 0 0 3px',
                background: 'transparent',
                color: filterMode === 'basic' ? token('color.link', '#0C66E4') : token('color.text', '#172B4D'),
                cursor: 'pointer',
              }}
            >
              Basic
            </button>
            <button
              onClick={switchToJql}
              style={{
                height: 32, padding: '0 8px', fontSize: 14,
                fontWeight: filterMode === 'jql' ? 600 : 400,
                border: `1px solid ${filterMode === 'jql' ? token('color.border.focused', '#388BFF') : token('color.border', '#DFE1E6')}`,
                borderRadius: '0 3px 3px 0',
                background: 'transparent',
                color: filterMode === 'jql' ? token('color.link', '#0C66E4') : token('color.text', '#172B4D'),
                cursor: 'pointer',
              }}
            >
              JQL
            </button>
          </div>

          {filterMode === 'jql' ? (
            /* JQL mode: show derived JQL as editable text (no engine — display only) */
            <div style={{ flex: 1, minWidth: 0 }}>
              <Textfield
                isCompact
                value={jqlText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setJqlText(e.target.value); markDirty(); }}
                placeholder="product = INV ORDER BY updated DESC"
              />
            </div>
          ) : (
            <>
          {/* Search */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <Textfield
              isCompact
              placeholder="Search requests"
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
                  <Button
                    appearance="subtle"
                    spacing="compact"
                    iconBefore={AkCloseIcon}
                    onClick={() => setSearch('')}
                    label="Clear search"
                  />
                ) : undefined
              }
            />
          </div>

          {/* Filter chips — Assignee → Type → Status */}
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

          {/* Active filter chips */}
          {(['assignee', 'workType', 'status'] as FilterFacet[]).flatMap(facet =>
            filters[facet].map(val => {
              const opt = (facetOptions[facet] ?? []).find(o => o.value === val);
              const displayLabel = opt?.label ?? val;
              return (
                <span
                  key={`${facet}:${val}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    height: 28, padding: '0 8px',
                    borderRadius: 3,
                    border: `1px solid ${token('color.border.focused', '#388BFF')}`,
                    background: 'transparent',
                    fontSize: 14,
                    color: token('color.link', '#0C66E4'),
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {FACET_LABELS[facet]}: {displayLabel}
                  <button
                    onClick={() => toggleValue(facet, val)}
                    style={{ background: 'none', border: 'none', padding: '0 0 0 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit', fontSize: 16, lineHeight: 1 }}
                    aria-label={`Remove ${FACET_LABELS[facet]} ${displayLabel}`}
                  >×</button>
                </span>
              );
            })
          )}
            </>
          )}
        </div>

        {/* Row 2: More filters · Clear · AvatarGroup · spacer · count · kebab · Save as · Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 24px 8px', flexWrap: 'nowrap' }}>
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

          {avatarData.length > 0 && (
            <AvatarGroup
              appearance="stack"
              size="small"
              maxCount={4}
              label="Assignees"
              data={avatarData}
              onAvatarClick={(_, member) => {
                const id = (member as any).key as string;
                toggleValue('assignee', id);
              }}
            />
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 8px', color: token('color.text.subtlest', '#626F86'), fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {isFetching && <Spinner size="small" />}
            {!isFetching && data != null && `${data.totalCount} item${data.totalCount === 1 ? '' : 's'}`}
          </div>

          {savedFilterId && loadedFilter && (
            <FilterKebabMenu
              filter={loadedFilter as any}
              currentUserId={currentUserId}
              rows={items}
              isLoadingRows={isFetching}
            />
          )}

          {savedFilterId && (
            <Button appearance="subtle" onClick={() => setSaveAsOpen(true)}>
              Save as
            </Button>
          )}

          <Button
            appearance="subtle"
            onClick={handleSaveClick}
            isDisabled={!isDirty || updateFilter.isPending}
          >
            {updateFilter.isPending ? 'Saving…' : 'Save filter'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '24px' }}>
          <JiraTable<JqlResultRow>
            columns={columns}
            data={items}
            getRowId={r => r.id}
            onRowClick={r => openDetail(r.key)}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
            isLoading={isLoading}
            density={density}
            ariaLabel="Product filter preview"
            rowsPerPage={0}
            page={1}
            totalRowCount={data?.totalCount}
            enableVirtualization
            enableColumnReorder
            columnOrder={columnOrder ?? undefined}
            onColumnOrderChange={(next) => setColumnOrder(next)}
            initialColumnWidths={columnWidths}
            onColumnWidthsChange={(widths) => {
              setColumnWidths(widths);
              try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths)); } catch { /* quota */ }
            }}
            stickyCreateFooter={{ onRefresh: () => {} }}
            columnVisibility={visibleColumns}
            onColumnVisibilityChange={setVisibleColumns}
            contextMenuActions={[]}
            selectable
            selection={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyView={
              <div style={{ padding: '32px 24px', textAlign: 'center', color: token('color.text.subtle'), fontSize: 14 }}>
                No requests match this filter. Adjust the criteria above.
              </div>
            }
          />
        </div>
      </div>

      {/* Save modals */}
      {saveOpen && (
        <FilterSaveModal
          initialJql={jql}
          initialName="Untitled filter"
          onClose={() => setSaveOpen(false)}
          onSaved={handleSaved}
          productKey={productCode}
        />
      )}
      {saveAsOpen && (
        <FilterSaveModal
          initialJql={jql}
          initialName={savedFilterName ? `${savedFilterName} (copy)` : 'Untitled filter'}
          onClose={() => setSaveAsOpen(false)}
          onSaved={handleSaved}
          productKey={productCode}
        />
      )}

      {/* Flag notifications */}
      <FlagGroup onDismissed={id => dismissFlag(id as string)}>
        {flags.map(flag => {
          if (flag.type === 'save-success') {
            return (
              <AkFlag
                key={flag.id}
                id={flag.id}
                appearance="success"
                icon={<AkInfoIcon label="Saved" color={token('color.icon.success', '#22A06B')} />}
                title="Filter saved"
                description="Your changes have been saved."
                actions={[{ content: 'Dismiss', onClick: () => dismissFlag(flag.id) }]}
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
