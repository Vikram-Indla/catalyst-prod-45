/**
 * AllWorkToolbar — Jira-parity refinement bar for the All Work surface.
 *
 * jira-compare catalog items 3-9 (2026-05-02). One row hosting:
 *   3. Ask Caty (Catalyst AI entry — replaces Jira's "Ask AI" label)
 *   4. Search work — @atlaskit/textfield, isCompact
 *   5. Avatar group filter — @atlaskit/avatar-group with overflow popover
 *   6. Filter button — Jira-shape Popup (8 facets in left rail, value
 *      picker in right pane, Clear all bottom-left, Shift+F shortcut hint).
 *      Mode tabs (Basic/Advanced/JQL) intentionally omitted per Vikram
 *      directive 2026-05-03.
 *   7. (Saved filters removed 2026-05-02)
 *   8. View toggle (list ↔ split) — @atlaskit/icon-button group
 *   9. Meatball — @atlaskit/dropdown-menu
 *
 * Lane A canonical (Jira BAU project, testid namespace
 * `issue-navigator.ui.refinement-bar.*`):
 *   container: flex · gap 8 · pad 8 12 · border-bottom 1px DFE1E6
 *   filter popup: 600w × 489h · left rail 140w · facet role=tab
 *   facet order: Fix versions, Parent, Assignee, Work type, Labels,
 *                Status, Priority, Reporter
 *
 * Filter selections forward via the typed FilterState prop so the parent
 * applies them client-side to the items list.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import Button, { IconButton } from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Popup from '@atlaskit/popup';
import { toast } from 'sonner';
import { EditorMoreIcon } from '@/components/layout/ProjectHeaderChipIcons';
import { Search as SearchGlyph, SlidersHorizontal, LayoutList, Columns3, Sparkles } from 'lucide-react';
import type { WorkItem } from '@/types/workItem.types';

export type AllWorkView = 'split' | 'list';

/* jira-compare 2026-05-03: 8-facet typed filter state matching Jira's
   Filter popup left-rail order. Each facet stores selected raw values
   (e.g. status display names like "In Progress", priority levels like
   "high"). Empty array = no filter on that facet. */
export type FilterFacet =
  | 'fixVersions' | 'parent' | 'assignee' | 'workType'
  | 'labels' | 'status' | 'priority' | 'reporter';

export type FilterState = Record<FilterFacet, string[]>;

export const EMPTY_FILTERS: FilterState = {
  fixVersions: [],
  parent: [],
  assignee: [],
  workType: [],
  labels: [],
  status: [],
  priority: [],
  reporter: [],
};

const FACET_ORDER: FilterFacet[] = [
  'fixVersions', 'parent', 'assignee', 'workType',
  'labels', 'status', 'priority', 'reporter',
];

const FACET_LABELS: Record<FilterFacet, string> = {
  fixVersions: 'Fix versions',
  parent: 'Parent',
  assignee: 'Assignee',
  workType: 'Work type',
  labels: 'Labels',
  status: 'Status',
  priority: 'Priority',
  reporter: 'Reporter',
};

interface Props {
  projectKey: string;
  query: string;
  onQueryChange: (q: string) => void;
  view: AllWorkView;
  onViewChange: (v: AllWorkView) => void;
  /** Items list — used to derive distinct value options per facet. */
  items?: WorkItem[];
  /** Per-facet selections; parent applies them client-side to items. */
  selectedFilters?: FilterState;
  onSelectedFiltersChange?: (next: FilterState) => void;
  /** Controlled popup open state — lifted so a page-level Shift+F handler can toggle. */
  filterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
  /** Avatar group selected user IDs (legacy — separate quick-filter strip). */
  selectedAssignees?: string[];
  onAssigneesChange?: (ids: string[]) => void;
}

/** Coerce any value (string / number / object / null) to a clean string
    label. Defensive — ph_issues.labels in particular can arrive as either
    string[] (sync path) or object[] (raw_json passthrough where each
    label is { name, description }). Without this guard distinctOptions
    crashes the page with "a.label.localeCompare is not a function". */
function toLabel(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.name === 'string') return o.name;
    if (typeof o.value === 'string') return o.value;
    if (typeof o.label === 'string') return o.label;
  }
  try { return String(v); } catch { return ''; }
}

/** Derive distinct option values for a given facet from the items list. */
function distinctOptions(items: WorkItem[], facet: FilterFacet): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const i of items) {
    switch (facet) {
      case 'fixVersions': {
        const v = toLabel(i.fixVersion);
        if (v) map.set(v, v);
        break;
      }
      case 'parent': {
        const pk = toLabel(i.parentKey);
        if (pk) {
          const ps = toLabel(i.parentSummary);
          map.set(pk, ps ? `${pk} · ${ps}` : pk);
        }
        break;
      }
      case 'assignee': {
        const id = toLabel(i.assigneeId);
        const nm = toLabel(i.assignee?.name);
        if (id && nm) map.set(id, nm);
        break;
      }
      case 'workType': {
        const v = toLabel(i.rawType);
        if (v) map.set(v, v);
        break;
      }
      case 'labels': {
        for (const l of (i.labels || [])) {
          const v = toLabel(l);
          if (v) map.set(v, v);
        }
        break;
      }
      case 'status': {
        const v = toLabel(i.statusName);
        if (v) map.set(v, v);
        break;
      }
      case 'priority': {
        const v = toLabel(i.priority);
        if (v) map.set(v, v.charAt(0).toUpperCase() + v.slice(1));
        break;
      }
      case 'reporter': {
        const id = toLabel(i.reporterId);
        const nm = toLabel(i.reporter?.name);
        if (id && nm) map.set(id, nm);
        break;
      }
    }
  }
  return Array.from(map.entries())
    .map(([value, label]) => ({ value: String(value), label: String(label) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Apply the active filters to a single item — true means it passes.
    Each comparison runs both sides through toLabel so non-string label
    values (object[] from raw_json) compare cleanly against the string[]
    selection state. */
export function itemPassesFilters(item: WorkItem, f: FilterState): boolean {
  if (f.fixVersions.length > 0 && !f.fixVersions.includes(toLabel(item.fixVersion))) return false;
  if (f.parent.length > 0 && !f.parent.includes(toLabel(item.parentKey))) return false;
  if (f.assignee.length > 0 && !f.assignee.includes(toLabel(item.assigneeId))) return false;
  if (f.workType.length > 0 && !f.workType.includes(toLabel(item.rawType))) return false;
  if (f.labels.length > 0) {
    const ils = (item.labels || []).map(toLabel);
    if (!f.labels.some(l => ils.includes(l))) return false;
  }
  if (f.status.length > 0 && !f.status.includes(toLabel(item.statusName))) return false;
  if (f.priority.length > 0 && !f.priority.includes(toLabel(item.priority))) return false;
  if (f.reporter.length > 0 && !f.reporter.includes(toLabel(item.reporterId))) return false;
  return true;
}

/** Total count of selected values across all facets. */
export function totalSelected(f: FilterState): number {
  return FACET_ORDER.reduce((n, k) => n + f[k].length, 0);
}

interface Member {
  id: string;
  name: string;
  src?: string | null;
}

const SearchIcon = () => <SearchGlyph size={14} />;
const FilterIcon = () => <SlidersHorizontal size={14} />;
const ListIcon = () => <LayoutList size={16} />;
const SplitIcon = () => <Columns3 size={16} />;
const SparkIcon = () => <Sparkles size={14} />;

export function AllWorkToolbar({
  projectKey,
  query,
  onQueryChange,
  view,
  onViewChange,
  items = [],
  selectedFilters = EMPTY_FILTERS,
  onSelectedFiltersChange,
  filterOpen: filterOpenProp,
  onFilterOpenChange,
  selectedAssignees = [],
  onAssigneesChange,
}: Props) {
  /* Controlled-or-uncontrolled filter popup open state. The page level
     mounts a Shift+F handler that drives this via `onFilterOpenChange`
     when supplied; otherwise we manage it locally. */
  const [filterOpenLocal, setFilterOpenLocal] = useState(false);
  const filterOpen = filterOpenProp !== undefined ? filterOpenProp : filterOpenLocal;
  const setFilterOpen = (next: boolean) => {
    if (onFilterOpenChange) onFilterOpenChange(next);
    else setFilterOpenLocal(next);
  };

  /* jira-compare 2026-05-03: which facet is highlighted in the left
     rail; right pane shows that facet's value picker. Null = empty
     state ("Select a field…" placeholder, mirroring Jira's empty pane). */
  const [activeFacet, setActiveFacet] = useState<FilterFacet | null>(null);

  const facetOptions = useMemo(() => {
    const out = {} as Record<FilterFacet, { value: string; label: string }[]>;
    for (const f of FACET_ORDER) out[f] = distinctOptions(items, f);
    return out;
  }, [items]);

  const totalCount = totalSelected(selectedFilters);

  const updateFacet = (facet: FilterFacet, next: string[]) => {
    if (!onSelectedFiltersChange) return;
    onSelectedFiltersChange({ ...selectedFilters, [facet]: next });
  };

  const toggleValue = (facet: FilterFacet, value: string) => {
    const cur = selectedFilters[facet];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    updateFacet(facet, next);
  };

  const clearAll = () => onSelectedFiltersChange?.(EMPTY_FILTERS);

  /* Avatar group seed — pull project members. Mirrors the pattern in
     BacklogPage.atlaskit.tsx ProjectChromeBand chrome-band-members. */
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['allwork-toolbar-members', projectKey],
    enabled: !!projectKey,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: project } = await (supabase as any)
        .from('projects').select('id').eq('key', projectKey).maybeSingle();
      if (!project?.id) return [];
      const { data } = await (supabase as any)
        .from('project_members')
        .select('user_id, profiles!inner(id, full_name, avatar_url)')
        .eq('project_id', project.id)
        .limit(20);
      return ((data ?? []) as any[]).map(r => ({
        id: r.profiles?.id ?? r.user_id,
        name: r.profiles?.full_name ?? 'Member',
        src: r.profiles?.avatar_url ?? null,
      }));
    },
  });

  const avatarData = members.map(m => ({
    key: m.id,
    name: m.name,
    src: m.src ?? undefined,
  }));

  return (
    <div
      data-testid="catalyst-allwork-toolbar.bar"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        background: 'transparent',
        flexShrink: 0,
        fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* 3. Ask Caty entry — replaces Jira's "Ask AI" with Catalyst's
          AskCatalystPill semantics. Stubs to a toast for now; real
          integration mounts the AskCatalystPill / Caty chat widget. */}
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={SparkIcon}
        onClick={() => toast('Ask Caty — coming soon')}
        testId="catalyst-allwork-toolbar.ask-caty"
      >
        Ask Caty
      </Button>

      {/* 4. Search */}
      <div style={{ flex: '0 1 220px', minWidth: 140 }}>
        <Textfield
          isCompact
          appearance="standard"
          placeholder="Search work"
          value={query}
          onChange={(e) => onQueryChange((e.target as HTMLInputElement).value)}
          elemBeforeInput={<span style={{ paddingLeft: 8, color: 'var(--ds-text-subtle, #505258)' }}><SearchIcon /></span>}
          testId="catalyst-allwork-toolbar.search"
        />
      </div>

      {/* 5. Avatar group filter */}
      {avatarData.length > 0 && (
        <AvatarGroup
          appearance="stack"
          size="small"
          maxCount={4}
          data={avatarData}
          onAvatarClick={(_, member) => {
            if (!onAssigneesChange) return;
            const id = (member as any).key as string;
            const next = selectedAssignees.includes(id)
              ? selectedAssignees.filter(x => x !== id)
              : [...selectedAssignees, id];
            onAssigneesChange(next);
          }}
          testId="catalyst-allwork-toolbar.assignee-avatars"
        />
      )}

      {/* 6. Filter popup — Jira shape (no Basic/Advanced/JQL tabs per
          Vikram 2026-05-03). Lane A canonical: 600w × 489h, left rail
          140w with 8 facet role=tab buttons, right pane shows value
          picker for the active facet, "Clear all" bottom-left,
          "Press Shift + F to open and close" bottom-right hint. */}
      <Popup
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        placement="bottom-start"
        content={() => (
          <div
            data-testid="catalyst-allwork-toolbar.filter-popup"
            style={{
              width: 600, height: 489, display: 'flex', flexDirection: 'column',
              fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setFilterOpen(false);
            }}
          >
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left rail — 8 facet tabs */}
              <div
                role="tablist"
                aria-orientation="vertical"
                style={{
                  width: 140, flexShrink: 0,
                  borderRight: '1px solid var(--ds-border, #DFE1E6)',
                  overflowY: 'auto', padding: '6px 0',
                }}
              >
                {FACET_ORDER.map(f => {
                  const isActive = activeFacet === f;
                  const count = selectedFilters[f].length;
                  return (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveFacet(f)}
                      data-testid={`catalyst-allwork-toolbar.filter-popup.facet.${f}`}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '6px 12px', border: 'none',
                        background: isActive ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                        color: isActive ? 'var(--ds-text-selected, #0C66E4)' : 'var(--ds-text, #292A2E)',
                        fontSize: 13, lineHeight: '20px', cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span>{FACET_LABELS[f]}</span>
                      {count > 0 && (
                        <span style={{
                          fontSize: 11, color: 'var(--ds-text-subtle, #505258)',
                          background: 'var(--ds-background-neutral, #DCDFE4)',
                          padding: '0 6px', borderRadius: 8, lineHeight: '16px',
                        }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right pane — value picker for the active facet */}
              <div
                role="tabpanel"
                style={{ flex: 1, padding: 16, overflowY: 'auto', minWidth: 0 }}
              >
                {activeFacet === null ? (
                  <div style={{
                    color: 'var(--ds-text-subtle, #505258)',
                    fontSize: 13, lineHeight: '20px',
                  }}>Select a field to start creating a filter.</div>
                ) : facetOptions[activeFacet].length === 0 ? (
                  <div style={{
                    color: 'var(--ds-text-subtle, #505258)',
                    fontSize: 13, lineHeight: '20px',
                  }}>No values available for this field.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {facetOptions[activeFacet].map(opt => {
                      const checked = selectedFilters[activeFacet].includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 8px', borderRadius: 3,
                            cursor: 'pointer',
                            fontSize: 13, color: 'var(--ds-text, #292A2E)',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleValue(activeFacet, opt.value)}
                            style={{ margin: 0 }}
                          />
                          <span style={{ flex: 1 }}>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom bar — Clear all + Shift+F hint */}
            <div
              style={{
                borderTop: '1px solid var(--ds-border, #DFE1E6)',
                padding: '8px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 12, color: 'var(--ds-text-subtle, #505258)',
              }}
            >
              <button
                onClick={clearAll}
                disabled={totalCount === 0}
                data-testid="catalyst-allwork-toolbar.filter-popup.clear-all"
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: totalCount > 0 ? 'var(--ds-text-brand, #0C66E4)' : 'var(--ds-text-disabled, #B3B9C4)',
                  cursor: totalCount > 0 ? 'pointer' : 'default',
                  fontSize: 13, fontFamily: 'inherit',
                }}
              >Clear all</button>
              <span>Press Shift + F to open and close</span>
            </div>
          </div>
        )}
        trigger={(triggerProps) => (
          <Button
            {...triggerProps}
            appearance="default"
            spacing="compact"
            iconBefore={FilterIcon}
            onClick={() => setFilterOpen(!filterOpen)}
            testId="catalyst-allwork-toolbar.filter"
          >
            Filter{totalCount > 0 ? ` (${totalCount})` : ''}
          </Button>
        )}
      />

      <span style={{ flex: 1 }} />

      {/* 7. Saved filters — REMOVED 2026-05-02 per Vikram directive
          ("saved filters is not required"). */}

      {/* 8. View toggle: list / split */}
      <div style={{ display: 'inline-flex', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4, overflow: 'hidden' }}>
        <IconButton
          icon={ListIcon}
          label="List view"
          appearance={view === 'list' ? 'primary' : 'subtle'}
          onClick={() => onViewChange('list')}
          testId="catalyst-allwork-toolbar.view-list"
        />
        <IconButton
          icon={SplitIcon}
          label="Split view"
          appearance={view === 'split' ? 'primary' : 'subtle'}
          onClick={() => onViewChange('split')}
          testId="catalyst-allwork-toolbar.view-split"
        />
      </div>

      {/* 9. Meatball */}
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <IconButton
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            {...props}
            icon={EditorMoreIcon}
            label="More toolbar actions"
            appearance="subtle"
            testId="catalyst-allwork-toolbar.meatball"
          />
        )}
      >
        <DropdownItemGroup>
          <DropdownItem onClick={() => toast('Export — coming soon')}>Export</DropdownItem>
          <DropdownItem onClick={() => toast('Share view — coming soon')}>Share view</DropdownItem>
          <DropdownItem onClick={() => toast('Refresh data')}>Refresh</DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </div>
  );
}
