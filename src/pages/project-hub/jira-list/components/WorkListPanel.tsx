/**
 * WorkListPanel — Jira-parity left panel: search + filter + scrollable card list
 * Matches Jira's actual split view left column styling exactly.
 *
 * 2026-04-20: navigator avatars are interactive — clicking the avatar opens
 * an Atlassian-style assignee picker (WorkCardAssigneePicker) that writes to
 * ph_issues and invalidates the list query so the card refreshes in real time.
 * Card body click still selects the row; the picker stopPropagation()s its
 * own click so the two interactions never collide.
 */
import React, { useMemo, useState } from 'react';
import { Search, Filter, ArrowUpDown, RotateCw } from 'lucide-react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { WorkCardAssigneePicker } from './WorkCardAssigneePicker';
import { WorkItemStatusLozenge } from '@/components/workflow';
import type { WorkItem } from '@/types/workItem.types';

interface Props {
  items: WorkItem[];
  selectedKey: string | null;
  onSelect: (id: string) => void;
  /** Project UUID — required for the assignee picker (project_members lookup). */
  projectId?: string;
  /** jira-compare 2026-05-02: AllWorkToolbar now owns the Search input.
   *  When externalQuery is provided, the rail filters by it and the
   *  inner search input is hidden. */
  externalQuery?: string;
}

export function WorkListPanel({ items, selectedKey, onSelect, projectId, externalQuery }: Props) {
  const [innerQuery, setInnerQuery] = useState('');
  const query = externalQuery !== undefined ? externalQuery : innerQuery;
  const setQuery = setInnerQuery;
  const showInnerSearch = externalQuery === undefined;
  /* jira-compare Patch #3: Sort "Created" toggles asc/desc.
     Default desc to match Jira's "Newest first" on All work. */
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  /* jira-compare catalog item 10 (2026-05-02): Jira NIN paginates the
     navigator at 50 per page with a "50 of 1000+" footer. Catalyst was
     rendering all 900+ cards at once. Local pagination — server-side
     paging is a follow-up if/when ph_issues row counts grow further. */
  const [pageSize, setPageSize] = useState(50);

  const filtered = useMemo(() => {
    /* jira-compare follow-up (2026-05-02): Vikram directive — the rail
       must show top-level work only. Subtasks (Sub-task / Backend /
       Frontend / Figma / Integration / etc.) are visible via the parent's
       SubtasksPanel and do not belong in the global navigator. Match
       Jira NIN's project-level issue list which surfaces only Story /
       Epic / QA Bug / Production Incident / Feature / Task. */
    const SUBTASK_TYPE_RE = /^(sub-?task|backend|frontend|figma|entity figma|integration)$/i;
    const topLevel = items.filter(i => {
      const t = (i.type || '') as string;
      const rawType = ((i as any).rawType || '') as string;
      return !SUBTASK_TYPE_RE.test(t) && !SUBTASK_TYPE_RE.test(rawType);
    });

    const q = query.trim().toLowerCase();
    const base = !q ? topLevel : topLevel.filter(i =>
      (i.jiraKey + ' ' + i.summary).toLowerCase().includes(q)
    );
    /* Sort by created (jira_created_at if present; falls back to id ordering). */
    const sorted = [...base].sort((a, b) => {
      const av = (a as any).jira_created_at ?? (a as any).createdAt ?? a.id ?? '';
      const bv = (b as any).jira_created_at ?? (b as any).createdAt ?? b.id ?? '';
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [items, query, sortDir]);

  return (
    /* jira-compare Phase 0 (2026-05-02): root fontFamily set so the rail
       inherits Atlassian Sans for any descendants without an explicit
       family. Without this the card <div role="button"> root inherits
       Inter 16px from <body>, even though the title/key spans set their
       own family explicitly — leaks through any future inner content. */
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: 14,
    }}>
      {/* Top bar: Search work | Filter — hidden when AllWorkToolbar
          owns search (externalQuery prop provided). */}
      {showInnerSearch && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid var(--cp-border-default, #DFE1E6)', background: 'transparent',
        flexWrap: 'nowrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
          border: '1px solid var(--cp-border-default, #DFE1E6)', borderRadius: 6, padding: '0 8px', height: 32,
          background: 'transparent',
        }}>
          <Search size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search work"
            style={{
              border: 'none', outline: 'none', boxShadow: 'none', width: '100%', fontSize: 14,
              fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
              background: 'transparent', color: 'var(--cp-text-primary, #172B4D)',
            }}
          />
        </div>

        <button style={{
          height: 32, padding: '0 10px', border: '1px solid var(--cp-border-default, #DFE1E6)',
          background: 'transparent', borderRadius: 6, cursor: 'pointer',
          fontSize: 13, fontFamily: 'var(--cp-font-body)', display: 'inline-flex',
          alignItems: 'center', gap: 4, color: 'var(--cp-text-secondary, #44546F)', flexShrink: 0,
        }}>
          <Filter size={14} />
          Filter
        </button>
      </div>
      )}

      {/* Sort header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--cp-border-default, #DFE1E6)', background: 'transparent',
      }}>
        <button
          onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
          aria-label={`Sort by Created ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
          style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontWeight: 600, color: 'var(--cp-text-primary, #172B4D)', fontSize: 14,
          fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
        }}>
          Created
          <svg width="10" height="6" viewBox="0 0 10 6" style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none' }}>
            <path d="M0 0l5 6 5-6z" fill="currentColor" opacity="0.55"/>
          </svg>
        </button>
        <div style={{ display: 'inline-flex', gap: 4 }}>
          <SortIconBtn><ArrowUpDown size={16} /></SortIconBtn>
          <SortIconBtn><RotateCw size={16} /></SortIconBtn>
        </div>
      </div>

      {/* Scrollable card list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', minHeight: 0, background: 'transparent' }}>
        {filtered.slice(0, pageSize).map(item => {
          const selected = item.id === selectedKey;
          const rtl = /[\u0600-\u06FF]/.test(item.summary);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item.id); } }}
              style={{
                // Jira parity (measured 2026-04-18, BAU-5500):
                // NOTE: rendered as <div role="button"> (not <button>) — the
                // card contains a nested interactive avatar picker, and
                // <button> inside <button> is invalid HTML that breaks the
                // inner click handler in some browsers.
                //   - NO hard border (was 1px/#DFE1E6)
                //   - Double shadow: 0 1px 1px rgba(30,31,33,0.25), 0 0 1px rgba(30,31,33,0.31)
                //   - 4px radius (was 8px)
                //   - Selected: #E9F2FE bg + 1px blue inner-shadow ring (no outline)
                //   - 2px margin between cards (was 8px)
                width: '100%', textAlign: 'left', display: 'block',
                border: 'none',
                background: selected ? 'var(--cp-interact-selected, #E9F2FE)' : 'var(--cp-bg-elevated, #FFFFFF)',
                borderRadius: 4,
                padding: 12,
                margin: '2px 0',
                cursor: 'pointer',
                boxShadow: selected
                  ? 'rgba(24, 104, 219, 0.4) 0px 0px 0px 1px, rgba(30, 31, 33, 0.18) 0px 1px 1px 0px'
                  : 'rgba(30, 31, 33, 0.25) 0px 1px 1px 0px, rgba(30, 31, 33, 0.31) 0px 0px 1px 0px',
                transition: 'background 80ms, box-shadow 80ms',
              }}
              onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = 'var(--cp-interact-hover, #F8F9FA)'; } }}
              onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = 'var(--cp-bg-elevated, #FFFFFF)'; } }}
            >
              <div
                dir={rtl ? 'rtl' : 'ltr'}
                style={{
                  // Jira card title: Atlassian Sans 14/400/#292A2E (weight 400, not 600).
                  // Selected state tints the title blue (#1868DB).
                  fontWeight: 400, color: selected ? 'var(--cp-text-link, #1868DB)' : 'var(--cp-text-primary, #292A2E)',
                  marginBottom: 8, lineHeight: '20px', fontSize: 14,
                  fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}
              >
                {item.summary || '(No title)'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  // Issue key in card: Atlassian Sans 12/400/#505258 (NOT monospace —
                  // Jira uses the same family as body, just smaller).
                  fontSize: 12, color: 'var(--cp-text-secondary, #505258)', display: 'inline-flex',
                  alignItems: 'center', gap: 6,
                  fontFamily: "'Atlassian Sans', -apple-system, sans-serif", fontWeight: 400,
                }}>
                  <WorkItemTypeIcon type={item.type} size={14} />
                  {item.jiraKey}
                </span>
                {/* Jira-parity status pill — colour derives from the workflow
                    engine (admin-editable at /admin/workflows) so all surfaces
                    share a single source of truth. */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <WorkItemStatusLozenge item={item} variant="bold" maxWidth={120} />
                  {/* Interactive assignee picker (replaces previous static avatar).
                      Uses dbId (UUID) — never issue_key (CLAUDE.md §L39). */}
                  <WorkCardAssigneePicker
                    dbId={item.dbId || item.id}
                    currentAssigneeId={item.assignee?.id ?? null}
                    currentAssigneeName={item.assignee?.name ?? null}
                    projectId={projectId}
                    fallbackInitials={item.assignee?.initials || 'NA'}
                    fallbackColor={item.assignee?.color || '#6554C0'}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer pagination — jira-compare catalog item 10 (2026-05-02).
            Mirrors Jira NIN's "50 of 1000+" footer with a "Load more"
            CTA. Page size grows by 50 each click; resets when filter or
            sort changes (page-size state would persist otherwise). */}
        <div style={{
          padding: '10px 8px 16px',
          fontSize: 12, textAlign: 'center',
          fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          {(() => {
            /* jira-compare 2026-05-02: Vikram screenshot — footer was
               showing "(filtered)" because the always-on subtask
               exclusion makes filtered.length < items.length. Footer
               should mirror Jira: "{visible} of {total}" only — no
               "(filtered)" suffix unless the user actually applied a
               filter (search query non-empty). */
            const visible = Math.min(pageSize, filtered.length);
            const total = filtered.length >= 1000 ? '1000+' : `${filtered.length}`;
            const userFiltered = query.trim().length > 0;
            return (
              <span style={{ color: 'var(--cp-text-tertiary, #626F86)' }}>
                {visible} of {total}{userFiltered ? ' (filtered)' : ''}
              </span>
            );
          })()}
          {pageSize < filtered.length && (
            <button
              onClick={() => setPageSize(s => s + 50)}
              style={{
                background: 'transparent', border: '1px solid var(--cp-border-default, #DFE1E6)',
                borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
                fontSize: 12, color: 'var(--cp-text-info, #1868DB)', fontWeight: 500,
                fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
              }}
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SortIconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        width: 28, height: 28, border: 'none', background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--cp-text-tertiary, #626F86)', borderRadius: 4,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-interact-hover, #F1F2F4)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
