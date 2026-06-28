// ============================================================================
// AllProjectsToolbar — Atlaskit-only filter rail (Apr 2026 page-scope rebuild)
// ============================================================================
//
// Per CLAUDE.md §7A page-level scope rule: when AllProjectsPage migrated to
// ADS, this sibling toolbar came in scope. Bespoke pill-chips and shadcn
// Popover replaced with @atlaskit/tabs + @atlaskit/select + @atlaskit/textfield.
// View toggle permanently removed — list is the only mode (card view dropped).
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import type { ProjectFilters } from '@/types/projecthub';

import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
// Block A rule 3 (2026-05-01): swap @atlaskit/badge → @atlaskit/lozenge for
// tab-count chips. Lozenge is the canonical ADS primitive for state/scalar
// chips and emits a separate text node so SR reads "All, 9 items" instead of
// the previous concatenated "All9". See atlassian.design/components/lozenge.
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import SearchIcon from '@atlaskit/icon/glyph/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';

interface ToolbarProps {
  filters: ProjectFilters;
  onFilterChange: (f: ProjectFilters) => void;
  stats: {
    total: number;
    statusActive: number;
    statusOnHold: number;
    statusPlanning: number;
    statusCompleted: number;
    statusStarred: number;
    statusMyProjects?: number;
  };
}

const TABS = ['All', 'My Projects', 'Starred'] as const;
type TabName = typeof TABS[number];

const STATUS_OPTIONS = ['Any', 'Active', 'Planning', 'On Hold', 'Completed'] as const;
type StatusOption = { label: string; value: string };
const STATUS_SELECT_OPTIONS: StatusOption[] = STATUS_OPTIONS.map((s) => ({ label: s, value: s }));

export function AllProjectsToolbar({
  filters,
  onFilterChange,
  stats,
}: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => onFilterChange({ ...filters, search: localSearch }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const activeTabIdx = Math.max(0, TABS.indexOf(filters.statusChip as TabName));

  const currentStatus: StatusOption = useMemo(() => {
    const raw = filters.statuses[0];
    if (!raw) return STATUS_SELECT_OPTIONS[0];
    const match = STATUS_OPTIONS.find(
      (s) => s.toLowerCase().replace(/\s/g, '_') === raw,
    );
    return match
      ? { label: match, value: match }
      : STATUS_SELECT_OPTIONS[0];
  }, [filters.statuses]);

  function getCount(tab: TabName): number {
    if (tab === 'All') return stats.total;
    if (tab === 'Starred') return stats.statusStarred;
    if (tab === 'My Projects') return stats.statusMyProjects ?? 0;
    return 0;
  }

  function handleTabSelect(idx: number) {
    onFilterChange({ ...filters, statusChip: TABS[idx], statuses: [] });
  }

  function handleStatusChange(opt: StatusOption | null) {
    if (!opt) return;
    const mapped =
      opt.value === 'Any' ? [] : [opt.value.toLowerCase().replace(/\s/g, '_')];
    onFilterChange({ ...filters, statuses: mapped });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Row 1: Tabs — full width, own row so Atlaskit's TabList separator
          doesn't visually bleed into the filters on the same flex line. */}
      <Tabs
        id="all-projects-tabs"
        selected={activeTabIdx}
        onChange={handleTabSelect}
      >
        <TabList>
          {TABS.map((tab) => {
            const count = getCount(tab);
            return (
              <Tab key={tab}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {tab}
                  <span style={{
                    position: 'absolute',
                    width: 1, height: 1, padding: 0, margin: -1,
                    overflow: 'hidden', clip: 'rect(0,0,0,0)',
                    whiteSpace: 'nowrap', borderWidth: 0,
                  }}>, </span>
                  {/* CLAUDE.md 2026-05-09: every Lozenge must be wrapped with
                      data-cp-lozenge-jira-parity to prevent ALLCAPS rendering */}
                  <span data-cp-lozenge-jira-parity>
                    <Lozenge appearance="default">{count}</Lozenge>
                  </span>
                </span>
              </Tab>
            );
          })}
        </TabList>
      </Tabs>

      {/* Row 2: Status filter + Search (right-aligned). Card view deprecated —
          view toggle removed. List is the only mode. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
        <div style={{ minWidth: 180 }}>
          <Select<StatusOption>
            inputId="status-filter"
            options={STATUS_SELECT_OPTIONS}
            value={currentStatus}
            onChange={(v) => handleStatusChange(v)}
            isSearchable={false}
            spacing="compact"
            aria-label="Filter by status"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
            components={{
              SingleValue: (props: any) => (
                <div
                  {...props.innerProps}
                  style={{
                    gridArea: '1 / 1 / 2 / 3',
                    color: token('color.text'),
                    fontSize: 'var(--ds-font-size-300)',
                    marginLeft: 2,
                    marginRight: 2,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: token('color.text.subtle') }}>Status: </span>
                  {props.data.label}
                </div>
              ),
            }}
          />
        </div>

        <div style={{ marginLeft: 'auto', width: 240 }}>
          <Textfield
            value={localSearch}
            onChange={(e) => setLocalSearch((e.target as HTMLInputElement).value)}
            placeholder="Search projects..."
            aria-label="Search projects"
            elemBeforeInput={
              <span style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: 8, color: token('color.text.subtle') }}>
                <SearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={
              localSearch ? (
                <button
                  type="button"
                  onClick={() => setLocalSearch('')}
                  aria-label="Clear search"
                  style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', paddingRight: 8, color: token('color.text.subtle') }}
                >
                  <CrossIcon label="" size="small" />
                </button>
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
