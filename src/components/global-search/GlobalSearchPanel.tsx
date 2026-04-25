import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SearchIcon from '@atlaskit/icon/glyph/search';
import RecentIcon from '@atlaskit/icon/glyph/recent';
import WorldIcon from '@atlaskit/icon/glyph/world';
import PersonIcon from '@atlaskit/icon/glyph/person';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRecentItems, useSearchResults } from '@/hooks/useGlobalSearch';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import { FilterDropdown, FilterOption } from './FilterDropdown';
import type { SearchResult } from '@/types/global-search';

// ── Data hooks ────────────────────────────────────────────────────────────────

/** Fetch distinct projects from ph_issues (real Jira-synced data). */
function useProjects() {
  return useQuery({
    queryKey: ['global-search-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('project_key, project_name')
        .order('project_key')
        .limit(500);
      if (error) return [];
      // Deduplicate by project_key
      const seen = new Map<string, FilterOption>();
      for (const row of data ?? []) {
        if (row.project_key && !seen.has(row.project_key)) {
          seen.set(row.project_key, {
            id: row.project_key,
            name: row.project_name || row.project_key,
            tag: row.project_key,
          });
        }
      }
      return [...seen.values()];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch approved team members for Assignee filter. */
function useTeamMembers() {
  return useQuery({
    queryKey: ['global-search-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name')
        .limit(100);
      if (error) return [];
      return (data ?? []).map((m: any): FilterOption => ({
        id: m.full_name || m.id,   // use display name as filter id for assignee_display_name search
        name: m.full_name || 'Unknown',
        avatarSrc: m.avatar_url ?? undefined,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'You viewed just now';
  if (m < 60) return `You viewed ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `You viewed ${h}h ago`;
  const d = Math.floor(h / 24);
  return `You viewed ${d}d ago`;
}

// ── Main component ────────────────────────────────────────────────────────────

interface GlobalSearchPanelProps {
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
}

export function GlobalSearchPanel({ query, onQueryChange, onClose }: GlobalSearchPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectKeys, setProjectKeys] = useState<string[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce query
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const { data: recents = [] } = useRecentItems();
  const { data: searchResults = [] } = useSearchResults(debouncedQuery, {
    hub: null,
    project: projectKeys[0] ?? null,
    assignee: assigneeIds[0] ?? null,
    type: null,
  });
  const { data: projectOptions = [] } = useProjects();
  const { data: memberOptions = [] } = useTeamMembers();

  // ── Row model ──────────────────────────────────────────────────────────────
  type Row =
    | { kind: 'suggestion'; id: string; label: React.ReactNode; activate: () => void }
    | { kind: 'item'; id: string; item: SearchResult; activate: () => void };

  const itemsToShow: SearchResult[] = debouncedQuery.length >= 2 ? searchResults : recents.slice(0, 7);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];

    if (debouncedQuery.length < 2) {
      // "Show my work items" — filters by current user when clicked
      out.push({
        kind: 'suggestion',
        id: 'sug-mywork',
        label: <>Show my <strong>work items</strong></>,
        activate: () => {
          navigate('/for-you?tab=assigned');
          onClose();
        },
      });
      // If assignee filter selected, show scoped suggestion
      if (assigneeIds.length > 0) {
        const name = memberOptions.find((o) => o.id === assigneeIds[0])?.name ?? assigneeIds[0];
        out.push({
          kind: 'suggestion',
          id: 'sug-assignee',
          label: <>Work items assigned to <strong>{name}</strong></>,
          activate: () => {
            navigate(`/work-hub/all?assignee=${encodeURIComponent(assigneeIds[0])}`);
            onClose();
          },
        });
      }
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

    return out;
  }, [debouncedQuery, itemsToShow, assigneeIds, memberOptions, navigate, onClose]);

  useEffect(() => { setActiveIndex(0); }, [rows.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, rows.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { const r = rows[activeIndex]; if (r) { e.preventDefault(); r.activate(); } }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, activeIndex, onClose]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const rowBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 16px', cursor: 'pointer', borderRadius: 3,
  };

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
        style={active ? { ...rowBase, background: token('color.background.neutral.hovered', '#F1F2F4') } : rowBase}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {content}
        </div>
        {right && (
          <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86'), fontFamily: 'var(--cp-font-body)', flexShrink: 0 }}>
            {right}
          </div>
        )}
      </div>
    );
  };

  const suggestionRows = rows.filter((r) => r.kind === 'suggestion');
  const itemRows = rows.filter((r) => r.kind === 'item');
  const showRecentLabel = debouncedQuery.length < 2;

  return (
    <div
      role="dialog"
      aria-label="Global search"
      style={{
        width: '100%',
        maxHeight: '60vh',
        background: token('elevation.surface.overlay', '#FFFFFF'),
        borderRadius: 8,
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* ── Filter chips row ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px',
        borderBottom: `1px solid ${token('color.border', '#F1F2F4')}`,
        flexShrink: 0,
      }}>
        <FilterDropdown
          label="Projects"
          searchPlaceholder="Find projects"
          leadingIcon={WorldIcon}
          options={projectOptions}
          selectedIds={projectKeys}
          onChange={setProjectKeys}
        />
        <FilterDropdown
          label="Assignee"
          searchPlaceholder="Find people"
          leadingIcon={PersonIcon}
          options={memberOptions}
          selectedIds={assigneeIds}
          onChange={setAssigneeIds}
        />
      </div>

      {/* ── Scrollable results ───────────────────────────────────────────── */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} role="listbox">

        {/* Suggestions */}
        {suggestionRows.map((r) =>
          renderRow(r,
            <>
              <div style={{ width: 28, display: 'flex', justifyContent: 'center', color: token('color.text.subtle', '#626F86') }}>
                <SearchIcon label="" />
              </div>
              <span style={{ fontSize: 14, color: token('color.text', '#172B4D') }}>
                {(r as any).label}
              </span>
            </>,
            'Suggestion',
          )
        )}

        {/* Recent / Results header */}
        {itemRows.length > 0 && (
          <div style={{
            padding: '10px 16px 4px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: token('color.text.subtle', '#626F86'),
          }}>
            {showRecentLabel ? 'Recent' : 'Results'}
          </div>
        )}

        {/* Result / Recent items */}
        {itemRows.map((r) => {
          const it = (r as any).item as SearchResult;
          const iconType = normalizeIconType(it.item_type);
          const projectLabel = it.project_name ?? it.project_key ?? '';
          const typeLabel = it.item_type
            ? it.item_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : '';
          return renderRow(r,
            <>
              <div style={{ width: 28, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <WorkItemIcon type={iconType} size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ fontWeight: 600 }}>{it.item_key}</strong>
                  {': '}
                  {highlight(it.title, debouncedQuery)}
                </div>
                <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86') }}>
                  {typeLabel}{projectLabel ? ` • ${projectLabel}` : ''}
                  {it.assignee_name ? ` • ${it.assignee_name}` : ''}
                </div>
              </div>
            </>,
            timeAgo(it.viewed_at),
          );
        })}

        {/* Empty state */}
        {debouncedQuery.length >= 2 && itemRows.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: token('color.text.subtle', '#626F86'), fontSize: 14 }}>
            No results for "<strong>{debouncedQuery}</strong>"
          </div>
        )}
      </div>
    </div>
  );
}
