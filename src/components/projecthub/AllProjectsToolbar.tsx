// ============================================================================
// AllProjectsToolbar — Atlaskit-only filter rail (Apr 2026 page-scope rebuild)
// ============================================================================
//
// Per CLAUDE.md §7A page-level scope rule: when AllProjectsPage migrated to
// ADS, this sibling toolbar came in scope. Bespoke pill-chips and shadcn
// Popover replaced with @atlaskit/tabs + @atlaskit/select + @atlaskit/textfield.
// View-toggle uses Atlaskit Button with appearance="subtle" + isSelected.
// Lucide imports retained ONLY for view-toggle glyphs since @atlaskit/icon
// doesn't ship clean list/grid analogues; flagged for future swap.
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import type { ProjectFilters, ViewMode } from '@/types/projecthub';

import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import Badge from '@atlaskit/badge';
import { token } from '@atlaskit/tokens';
import SearchIcon from '@atlaskit/icon/glyph/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';
// View-toggle: Atlaskit doesn't ship list/grid glyphs. These two Lucide imports
// are explicitly retained per CLAUDE.md §7A allowance (UI chrome with no
// Atlaskit equivalent). Replace if @atlaskit/icon-lab adds them.
import { List as ListIcon, LayoutGrid as GridIcon } from 'lucide-react';

interface ToolbarProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
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
  view,
  onViewChange,
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {/* Atlaskit Tabs — All / My Projects / Starred */}
      <div style={{ minWidth: 320 }}>
        <Tabs
          id="all-projects-tabs"
          selected={activeTabIdx}
          onChange={handleTabSelect}
        >
          <TabList>
            {TABS.map((tab) => (
              <Tab key={tab}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {tab}
                  <Badge appearance="default">{getCount(tab)}</Badge>
                </span>
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </div>

      {/* Atlaskit Select — Status filter (always shows "Status:" prefix) */}
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
          styles={{
            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
          }}
          components={{
            SingleValue: (props: any) => (
              <div
                {...props.innerProps}
                style={{
                  gridArea: '1 / 1 / 2 / 3',
                  color: token('color.text'),
                  fontSize: 13,
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

      {/* Right side: Atlaskit Textfield search + view toggle */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 240 }}>
          <Textfield
            value={localSearch}
            onChange={(e) => setLocalSearch((e.target as HTMLInputElement).value)}
            placeholder="Search projects..."
            aria-label="Search projects"
            elemBeforeInput={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                  color: token('color.text.subtle'),
                }}
              >
                <SearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={
              localSearch ? (
                <button
                  type="button"
                  onClick={() => setLocalSearch('')}
                  aria-label="Clear search"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    paddingRight: 8,
                    color: token('color.text.subtle'),
                  }}
                >
                  <CrossIcon label="" size="small" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* View toggle — Atlaskit Buttons with isSelected */}
        <div
          style={{
            display: 'inline-flex',
            border: `1px solid ${token('color.border')}`,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Button
            appearance="subtle"
            spacing="compact"
            isSelected={view === 'list'}
            onClick={() => onViewChange('list')}
            aria-label="List view"
          >
            <ListIcon size={14} />
          </Button>
          <Button
            appearance="subtle"
            spacing="compact"
            isSelected={view === 'cards' || view === 'card'}
            onClick={() => onViewChange('cards')}
            aria-label="Grid view"
          >
            <GridIcon size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
