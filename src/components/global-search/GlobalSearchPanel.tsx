import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@atlaskit/avatar';
import SearchIcon from '@atlaskit/icon/glyph/search';
import RecentIcon from '@atlaskit/icon/glyph/recent';
import AppSwitcherIcon from '@atlaskit/icon/glyph/app-switcher';
import WorldIcon from '@atlaskit/icon/glyph/world';
import PersonIcon from '@atlaskit/icon/glyph/person';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';
import { useRecentItems, useSearchResults } from '@/hooks/useGlobalSearch';
import { WorkItemTypeIcon } from '@/components/workhub/jira-issue-type-icons';
import { FilterDropdown, FilterOption } from './FilterDropdown';
import type { SearchResult, WorkItemType } from '@/types/global-search';

// GlobalSearchPanel — Jira-parity command palette panel rendered by the
// header search trigger. Anchored bottom-start to the search Textfield via
// Popup; this component owns content + keyboard nav + filter chip state.
// Sections (in order, matching Jira reference image):
//   1. Filter chips row: App / Space / Assignee
//   2. Suggestions (mocked when no query)
//   3. Recent search (mocked queries)
//   4. RECENT items (real data from useRecentItems)
//   5. Quick scope chips: Boards, Spaces, Filters, Plans, Teams
//   6. Action rows: Search Jira for work items / Search all apps
//   7. Footer: Help us improve / Why has search changed
//
// Width 920px (capped by viewport - 24px). Only the result list scrolls.

interface GlobalSearchPanelProps {
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
}

// Mock filter sources — wire to real backend later.
const APP_OPTIONS: FilterOption[] = [
  { id: 'jira', name: 'Jira' },
  { id: 'confluence', name: 'Confluence' },
  { id: 'github', name: 'GitHub' },
  { id: 'gdrive', name: 'Google Drive' },
];

const SPACE_OPTIONS: FilterOption[] = [
  { id: 'BAU', name: 'Senaei BAU', tag: 'BAU' },
  { id: 'DATA', name: 'DATA Project', tag: 'DATA' },
  { id: 'IP', name: 'IP Implementation', tag: 'IP' },
  { id: 'MWR', name: 'MIM Website Revamp', tag: 'MWR' },
  { id: 'ISA', name: 'Industry.sa', tag: 'ISA' },
];

const ASSIGNEE_OPTIONS: FilterOption[] = [
  { id: 'vikram', name: 'vikram indla' },
  { id: 'yazeed', name: 'Yazeed Daraz' },
  { id: 'nada', name: 'Nada alfassam' },
  { id: 'imran', name: 'Imran Aslam' },
  { id: 'suleiman', name: 'Suleiman Ahmad Allawanseh' },
];

// Highlight matched substring inside title.
function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FFF7D6', color: 'inherit', padding: 0 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// Format an ISO timestamp into Jira-style "You viewed N hours/days ago"
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'You viewed just now';
  if (m < 60) return `You viewed ${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `You viewed ${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `You viewed ${d} day${d === 1 ? '' : 's'} ago`;
}

export function GlobalSearchPanel({ query, onQueryChange, onClose }: GlobalSearchPanelProps) {
  const navigate = useNavigate();
  const [appIds, setAppIds] = useState<string[]>([]);
  const [spaceKeys, setSpaceKeys] = useState<string[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce the query so suggestions/recent/results all settle together.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const { data: recents = [] } = useRecentItems();
  const { data: searchResults = [] } = useSearchResults(debouncedQuery, {
    hub: null,
    project: spaceKeys[0] ?? null,
    assignee: assigneeIds[0] ?? null,
    type: null,
  });

  // ── Build the concrete row list for keyboard navigation ──────────────
  // Each row carries a kind (suggestion / recent-search / item / action)
  // plus whatever payload it needs to perform its activate action.
  type Row =
    | { kind: 'suggestion'; id: string; label: React.ReactNode; activate: () => void }
    | { kind: 'recent-search'; id: string; label: string; activate: () => void }
    | { kind: 'item'; id: string; item: SearchResult; activate: () => void }
    | { kind: 'action'; id: string; label: string; activate: () => void };

  const itemsToShow: SearchResult[] = debouncedQuery.length >= 2 ? searchResults : recents.slice(0, 7);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (debouncedQuery.length < 2) {
      out.push({
        kind: 'suggestion',
        id: 'sug-mywork',
        label: <>Show my <strong>work items</strong></>,
        activate: () => navigate('/work-hub/my-work'),
      });
      if (assigneeIds.length > 0) {
        const name = ASSIGNEE_OPTIONS.find((o) => o.id === assigneeIds[0])?.name ?? '';
        out.push({
          kind: 'suggestion',
          id: 'sug-assignee',
          label: <>tickets assigned to <strong>{name}</strong></>,
          activate: () => navigate(`/work-hub/all?assignee=${assigneeIds[0]}`),
        });
      }
      out.push({
        kind: 'recent-search',
        id: 'rs-4189',
        label: '4189',
        activate: () => onQueryChange('4189'),
      });
    }
    itemsToShow.forEach((it) => {
      out.push({
        kind: 'item',
        id: it.id,
        item: it,
        activate: () => {
          navigate(`/work-hub/all?open=${encodeURIComponent(it.item_key)}`);
          onClose();
        },
      });
    });
    out.push({
      kind: 'action',
      id: 'act-jira',
      label: 'Search Jira for work items',
      activate: () => navigate(`/work-hub/all?q=${encodeURIComponent(debouncedQuery)}`),
    });
    out.push({
      kind: 'action',
      id: 'act-apps',
      label: 'Search all apps',
      activate: () => navigate(`/search?q=${encodeURIComponent(debouncedQuery)}`),
    });
    return out;
  }, [debouncedQuery, itemsToShow, assigneeIds, navigate, onClose, onQueryChange]);

  // Reset active index whenever rows change shape.
  useEffect(() => {
    setActiveIndex(0);
  }, [rows.length]);

  // Keyboard nav (arrow up/down + enter)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const r = rows[activeIndex];
        if (r) {
          e.preventDefault();
          r.activate();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, activeIndex]);

  // Render helpers ─────────────────────────────────────────────────────
  const rowBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 3,
  };
  const rowActive: React.CSSProperties = { ...rowBase, background: '#F1F2F4' };

  let rowCursor = 0;
  const renderRow = (r: Row, content: React.ReactNode, right?: React.ReactNode) => {
    const i = rowCursor++;
    const active = i === activeIndex;
    return (
      <div
        key={r.id}
        role="option"
        aria-selected={active}
        onMouseEnter={() => setActiveIndex(i)}
        onClick={() => r.activate()}
        style={active ? rowActive : rowBase}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {content}
        </div>
        {right ? (
          <div
            style={{
              fontSize: 12,
              color: '#626F86',
              fontFamily: 'Inter, system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            {right}
          </div>
        ) : null}
      </div>
    );
  };

  // Bucket rows for section ordering
  const suggestionRows = rows.filter((r) => r.kind === 'suggestion');
  const recentSearchRows = rows.filter((r) => r.kind === 'recent-search');
  const itemRows = rows.filter((r) => r.kind === 'item');
  const actionRows = rows.filter((r) => r.kind === 'action');

  const showRecentLabel = debouncedQuery.length < 2;

  return (
    <div
      role="dialog"
      aria-label="Global search"
      style={{
        width: 'min(920px, calc(100vw - 24px))',
        maxHeight: 'min(80vh, 720px)',
        background: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #DFE1E6',
        boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16), 0 2px 4px rgba(9, 30, 66, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Filter chip row — pinned at top */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid #F1F2F4',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          aria-label="Filters"
          style={{
            all: 'unset',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 4,
            border: '1px solid #DFE1E6',
            cursor: 'pointer',
          }}
        >
          <FilterIcon label="" />
        </button>
        <FilterDropdown
          label="App"
          searchPlaceholder="Find apps"
          leadingIcon={AppSwitcherIcon}
          options={APP_OPTIONS}
          selectedIds={appIds}
          onChange={setAppIds}
        />
        <FilterDropdown
          label="Space"
          searchPlaceholder="Find spaces"
          leadingIcon={WorldIcon}
          options={SPACE_OPTIONS}
          selectedIds={spaceKeys}
          onChange={setSpaceKeys}
        />
        <FilterDropdown
          label="Assignee"
          searchPlaceholder="Find people"
          leadingIcon={PersonIcon}
          options={ASSIGNEE_OPTIONS}
          selectedIds={assigneeIds}
          onChange={setAssigneeIds}
        />
      </div>

      {/* Scrollable result region */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} role="listbox">
        {/* Suggestions */}
        {suggestionRows.map((r) =>
          renderRow(
            r,
            <>
              <div style={{ width: 28, display: 'flex', justifyContent: 'center', color: '#626F86' }}>
                <SearchIcon label="" />
              </div>
              <span style={{ fontSize: 14, color: '#172B4D' }}>{(r as any).label}</span>
            </>,
            'Suggestion',
          ),
        )}

        {/* Recent searches */}
        {recentSearchRows.map((r) =>
          renderRow(
            r,
            <>
              <div style={{ width: 28, display: 'flex', justifyContent: 'center', color: '#626F86' }}>
                <RecentIcon label="" />
              </div>
              <span style={{ fontSize: 14, color: '#172B4D' }}>{(r as any).label}</span>
            </>,
            'Recent search',
          ),
        )}

        {/* RECENT items section header */}
        {itemRows.length > 0 ? (
          <div
            style={{
              padding: '10px 16px 4px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#626F86',
            }}
          >
            {showRecentLabel ? 'Recent' : 'Results'}
          </div>
        ) : null}

        {itemRows.map((r) => {
          const it = (r as any).item as SearchResult;
          const projectLabel = it.project_name ?? it.project_key ?? '';
          const typeLabel = it.item_type
            ? it.item_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : '';
          return renderRow(
            r,
            <>
              <div style={{ width: 28, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <WorkItemTypeIcon type={it.item_type as WorkItemType} size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: '#172B4D',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <strong style={{ fontWeight: 600 }}>{it.item_key}</strong>: {highlight(it.title, debouncedQuery)}
                </div>
                <div style={{ fontSize: 12, color: '#626F86' }}>
                  Jira • {typeLabel} • {projectLabel}
                </div>
              </div>
            </>,
            timeAgo(it.viewed_at),
          );
        })}

        {/* Quick scope chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px 8px',
            borderTop: '1px solid #F1F2F4',
            marginTop: 8,
          }}
        >
          <ShortcutIcon label="" />
          {['Boards', 'Spaces', 'Filters', 'Plans', 'Teams'].map((l) => (
            <button
              key={l}
              type="button"
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 16,
                border: '1px solid #DFE1E6',
                fontSize: 13,
                color: '#172B4D',
                lineHeight: 1,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Actions */}
        {actionRows.map((r) =>
          renderRow(
            r,
            <>
              <div style={{ width: 28, display: 'flex', justifyContent: 'center', color: '#626F86' }}>
                <SearchIcon label="" />
              </div>
              <span style={{ fontSize: 14, color: '#172B4D' }}>{(r as any).label}</span>
            </>,
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 22,
                height: 20,
                padding: '0 6px',
                borderRadius: 3,
                border: '1px solid #DFE1E6',
                background: '#F4F5F7',
                color: '#626F86',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ↵
            </span>,
          ),
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid #F1F2F4',
          fontSize: 12,
          color: '#626F86',
          flexShrink: 0,
        }}
      >
        <span>
          Help us improve search{' '}
          <a href="#" style={{ color: '#0C66E4', textDecoration: 'none' }}>
            Give feedback
          </a>
        </span>
        <a href="#" style={{ color: '#0C66E4', textDecoration: 'none' }}>
          Why has search changed?
        </a>
      </div>
    </div>
  );
}
