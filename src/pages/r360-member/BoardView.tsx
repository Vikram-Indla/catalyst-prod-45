/**
 * R360 Board View — Enterprise-grade personal kanban.
 *
 * Filtering rules (Vikram 2026-06-05):
 *   - Sub-tasks, Backend, Frontend: HIDDEN. Show parent Story instead.
 *   - Epics: HIDDEN from cards. Epic name shown ON the card as breadcrumb.
 *   - Done column: REMOVED. Personal board = active work only.
 *   - Q2-2026 label: REMOVED.
 *   - Swimlanes: DEFAULT COLLAPSED. User expands what they need.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import Badge from '@atlaskit/badge';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { R360WorkItem } from '@/types/r360';
import { QuickSearchInput } from './QuickSearchInput';
import { CatyBoardInsight } from '@/components/for-you/atlaskit/CatyBoardInsight';

// ── Subtask types that should surface their parent instead ──────────
const SUBTASK_TYPES = new Set(['sub-task', 'backend', 'frontend']);

function isSubtaskType(type: string): boolean {
  return SUBTASK_TYPES.has((type || '').toLowerCase());
}

// ── Status → Lozenge appearance ─────────────────────────────────────
function statusAppearance(cat: string): 'success' | 'inprogress' | 'moved' | 'default' {
  if (cat === 'done') return 'success';
  if (cat === 'in_progress' || cat === 'in_qa') return 'inprogress';
  return 'default';
}

function mapCategory(item: R360WorkItem): string {
  const cat = item.status_category;
  if (cat === 'in_progress' || cat === 'in_qa') return 'in_progress';
  return 'to_do';
}

// ── Board Card — Jira enterprise pattern ────────────────────────────
function BoardCard({ item, onSelect }: { item: R360WorkItem; onSelect: (i: R360WorkItem) => void }) {
  const hasParent = !!(item.parent_key && item.parent_title);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); } }}
      style={{
        background: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 4,
        padding: '8px 12px',
        cursor: 'pointer',
        transition: 'box-shadow 80ms ease, border-color 80ms ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.25), 0 0 1px 0 rgba(9,30,66,0.31)');
        (e.currentTarget as HTMLElement).style.borderColor = token('color.border.focused', '#388BFF');
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.borderColor = token('color.border', '#DFE1E6');
      }}
    >
      {/* Title — primary content */}
      <div style={{
        fontSize: 14, fontWeight: 400, lineHeight: '20px',
        color: token('color.text', '#172B4D'),
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
        marginBottom: hasParent ? 4 : 8,
      }}>
        {item.title}
      </div>

      {/* Epic/parent breadcrumb */}
      {hasParent && (
        <div style={{
          fontSize: 11, fontWeight: 400, lineHeight: '16px',
          color: token('color.text.subtlest', '#626F86'),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 8,
        }}>
          {item.parent_key} {item.parent_title}
        </div>
      )}

      {/* Meta row: icon + key + lozenge + age */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <JiraIssueTypeIcon type={item.item_type} size={16} />
        <span style={{
          fontSize: 11, fontWeight: 600,
          fontFamily: token('font.family.code', 'monospace'),
          color: token('color.link', '#0052CC'),
        }}>
          {item.item_key}
        </span>
        <span style={{ flex: 1 }} />
        <Lozenge appearance={statusAppearance(item.status_category)}>
          {item.status || 'To do'}
        </Lozenge>
        <Tooltip content={`Open ${item.age_days} days`}>
          {(tooltipProps) => (
            <span {...tooltipProps} style={{
              fontSize: 11, fontWeight: 400,
              color: item.age_days > 30
                ? token('color.text.warning', '#974F0C')
                : token('color.text.subtlest', '#626F86'),
            }}>
              {item.age_days}d
            </span>
          )}
        </Tooltip>
      </div>
    </div>
  );
}

// ── Column Header ───────────────────────────────────────────────────
function ColumnHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      paddingBottom: 8, marginBottom: 8,
      borderBottom: `2px solid ${color}`,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: token('color.text', '#292A2E') }}>{label}</span>
      <span style={{ marginLeft: 'auto' }}>
        <Badge>{count}</Badge>
      </span>
    </div>
  );
}

// ── Swimlane with collapsible cards ─────────────────────────────────
function ProjectSwimlane({
  projectKey, projectName, items, onSelect, defaultCollapsed,
}: {
  projectKey: string; projectName: string; items: R360WorkItem[];
  onSelect: (i: R360WorkItem) => void; defaultCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [showAll, setShowAll] = useState(false);

  const todoItems = useMemo(() => items.filter(i => mapCategory(i) === 'to_do'), [items]);
  const ipItems = useMemo(() => items.filter(i => mapCategory(i) === 'in_progress'), [items]);

  const CARD_LIMIT = 8;
  const todoVisible = showAll ? todoItems : todoItems.slice(0, CARD_LIMIT);
  const ipVisible = showAll ? ipItems : ipItems.slice(0, CARD_LIMIT);
  const hasMore = todoItems.length > CARD_LIMIT || ipItems.length > CARD_LIMIT;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Swimlane header — elevated project distinction */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed); } }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          height: 40,
          background: token('color.background.neutral', '#F1F2F4'),
          borderLeft: `3px solid ${token('color.border.brand', '#1D7AFC')}`,
          borderRadius: collapsed ? 4 : '4px 4px 0 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {collapsed
          ? <ChevronRightIcon label="" size="small" primaryColor={token('color.icon', '#44546F')} />
          : <ChevronDownIcon label="" size="small" primaryColor={token('color.icon', '#44546F')} />
        }
        <span style={{
          fontSize: 13, fontWeight: 653, letterSpacing: '0.01em',
          color: token('color.text', '#172B4D'),
        }}>
          {projectKey}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 400,
          color: token('color.text.subtle', '#44546F'),
        }}>
          {projectName}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
            {todoItems.length} to do
          </span>
          <span style={{ fontSize: 11, color: token('color.text.information', '#0055CC') }}>
            {ipItems.length} in progress
          </span>
          <Badge appearance="default">{items.length}</Badge>
        </span>
      </div>

      {/* Columns grid */}
      {!collapsed && (
        <div style={{
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          padding: 16,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* To do column */}
            <div>
              <ColumnHeader label="To do" color={token('color.icon.warning', '#974F0C')} count={todoItems.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todoVisible.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: token('color.text.subtlest', '#626F86'), border: `1px dashed ${token('color.border', '#DFE1E6')}`, borderRadius: 4 }}>
                    Nothing here
                  </div>
                )}
                {todoVisible.map(item => <BoardCard key={item.id} item={item} onSelect={onSelect} />)}
              </div>
            </div>

            {/* In progress column */}
            <div>
              <ColumnHeader label="In progress" color={token('color.icon.information', '#0055CC')} count={ipItems.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ipVisible.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: token('color.text.subtlest', '#626F86'), border: `1px dashed ${token('color.border', '#DFE1E6')}`, borderRadius: 4 }}>
                    Nothing here
                  </div>
                )}
                {ipVisible.map(item => <BoardCard key={item.id} item={item} onSelect={onSelect} />)}
              </div>
            </div>
          </div>

          {/* Show more / less toggle */}
          {hasMore && (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); setShowAll(!showAll); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  color: token('color.link', '#0052CC'),
                  padding: '4px 8px',
                }}
              >
                {showAll ? 'Show fewer' : `Show all (${items.length} items)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter: subtask types → parent Story ────────────────────────────
function filterForBoard(items: R360WorkItem[]): R360WorkItem[] {
  const byKey = new Map<string, R360WorkItem>();
  items.forEach(i => byKey.set(i.item_key, i));

  const result = new Map<string, R360WorkItem>();

  for (const item of items) {
    if (item.status_category === 'done') continue;
    if ((item.item_type || '').toLowerCase() === 'epic') continue;

    if (isSubtaskType(item.item_type)) {
      if (item.parent_key && byKey.has(item.parent_key)) {
        const parent = byKey.get(item.parent_key)!;
        if (parent.status_category !== 'done' && (parent.item_type || '').toLowerCase() !== 'epic') {
          result.set(parent.item_key, parent);
        }
      }
      continue;
    }

    result.set(item.item_key, item);
  }

  return Array.from(result.values());
}

// ── Main Component ──────────────────────────────────────────────────
export function BoardView({ items, onSelect, resourceId }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void; resourceId?: string | null }) {
  const [quickSearch, setQuickSearch] = useState('');
  // Board health panel renders into this slot (below the toolbar, above the
  // swimlanes) so the button stays inline on the toolbar row and the expanded
  // result pushes the board down instead of replacing the button.
  const [insightSlot, setInsightSlot] = useState<HTMLDivElement | null>(null);

  const boardItems = useMemo(() => filterForBoard(items), [items]);

  const filteredItems = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return boardItems;
    return boardItems.filter(i =>
      (i.item_key || '').toLowerCase().includes(q) ||
      (i.title || '').toLowerCase().includes(q) ||
      (i.parent_key || '').toLowerCase().includes(q)
    );
  }, [boardItems, quickSearch]);

  const projectGroups = useMemo(() => {
    const map: Record<string, { name: string; items: R360WorkItem[] }> = {};
    filteredItems.forEach(item => {
      const key = item.project_key;
      if (!map[key]) map[key] = { name: item.project_name || key, items: [] };
      map[key].items.push(item);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.items.length - a.items.length);
  }, [filteredItems]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 16,
      }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <QuickSearchInput
            value={quickSearch}
            onChange={setQuickSearch}
            resultCount={quickSearch.trim() ? filteredItems.length : undefined}
            totalCount={boardItems.length}
          />
        </div>
        <span style={{
          fontSize: 12, fontWeight: 400,
          color: token('color.text.subtlest', '#626F86'),
        }}>
          {filteredItems.length} items across {projectGroups.length} projects
        </span>
        {/* Board health pinned to the far-right end of the toolbar. */}
        <div style={{ marginLeft: 'auto' }}>
          <CatyBoardInsight resourceId={resourceId} panelPortalTarget={insightSlot} />
        </div>
      </div>

      {/* Board health result lands here — below the toolbar, pushing the board down */}
      <div ref={setInsightSlot} />

      {/* Swimlanes — default collapsed */}
      {projectGroups.map(([key, group]) => (
        <ProjectSwimlane
          key={key}
          projectKey={key}
          projectName={group.name}
          items={group.items}
          onSelect={onSelect}
          defaultCollapsed={true}
        />
      ))}
    </div>
  );
}
