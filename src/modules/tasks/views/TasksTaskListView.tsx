/**
 * TasksTaskListView — Tasks Hub list view.
 *
 * Refactored 2026-06-16 (Task 1.5b) to match Project Hub backlog
 * (`/project-hub/:key/backlog`) structurally:
 *   1. TasksPageHeader (breadcrumb + H1)
 *   2. Inline toolbar: Search list · Filters · Avatar group · Saved filters
 *      · Group dropdown · Sort caret · ⋯ · item count
 *   3. JiraTable mount with selectable + columnVisibility wired
 *
 * The toolbar mirrors BacklogPage.atlaskit.tsx lines 3437–3641 (Project Hub).
 * Filters / Saved filters / Group / Sort / ⋯ are visual placeholders for v1
 * — they render the right primitives at the right positions but their click
 * handlers are no-ops (or open empty menus). Functional wiring is a follow-up
 * task. Search and Avatar-group are partially functional (search filters
 * client-side; avatar clicks are no-op for now).
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - JiraTable for the table itself
 *   - DEFAULT_VISIBLE_COLUMNS from the column registry
 *   - useTasksTableData for rows + columns + users
 *   - TasksPageHeader for breadcrumb + H1
 *
 * Detail route note: at the time of writing there is no `/tasks/list/:key`
 * route registered (only `/tasks/:view`). `onOpen` is a no-op and `getHref`
 * returns '#' until a Tasks detail surface is built.
 */
import { useMemo, useState } from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkMoreIcon from '@atlaskit/icon/glyph/more';
import { token } from '@atlaskit/tokens';
import { JiraTable } from '@/components/shared/JiraTable';
import { useTasksTableData } from '@/modules/tasks/hooks/useTasksTableData';
import { DEFAULT_VISIBLE_COLUMNS } from '@/modules/tasks/columns/tasksListColumns';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';
import type { PlannerTask } from '@/modules/tasks/types';

// Placeholder Group-by options — wiring deferred. Visual only.
const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'Status' },
  { value: 'workstream', label: 'Workstream' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
] as const;

export default function TasksTaskListView() {
  const { rows, columns, isLoading, error, users } = useTasksTableData({
    onOpen: () => {
      // No Tasks detail route yet — intentional no-op.
    },
    getHref: () => '#',
  });

  // ── Toolbar state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<(typeof GROUP_BY_OPTIONS)[number]['value']>('none');

  // ── JiraTable state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set<string>(DEFAULT_VISIBLE_COLUMNS),
  );

  // ── Client-side filter: title/key substring match (case-insensitive) ─────
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.title.toLowerCase().includes(q) || r.key.toLowerCase().includes(q),
    );
  }, [rows, search]);

  // ── AvatarGroup data — full team directory (users with avatars) ─────────
  // Zero-assumption (CLAUDE.md 2026-06-11): drop users with no avatarUrl so
  // the stack doesn't render initials-only placeholders mixed with real
  // avatars. Mirrors Project Hub's `activeAssignees` filter.
  const avatarData = useMemo(
    () =>
      users
        .filter((u) => u.avatarUrl)
        .map((u) => ({ key: u.id, name: u.name, src: u.avatarUrl })),
    [users],
  );

  if (error) {
    return (
      <div style={{ padding: 16, color: 'var(--ds-text-danger, #AE2A19)' }}>
        Error loading tasks.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        background: 'var(--ds-surface, #FFFFFF)',
      }}
    >
      {/* ── Page header (breadcrumb + H1) ──────────────────────────────── */}
      <TasksPageHeader routeWord="Task list" />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '16px 24px',
          marginBottom: 4,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        }}
      >
        {/* Search list — Atlaskit Textfield (matches Project Hub). */}
        <div style={{ flex: 1, minWidth: 240, maxWidth: 640 }}>
          <Textfield
            isCompact
            placeholder="Search list"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            elemBeforeInput={
              <span
                style={{
                  paddingInlineStart: 8,
                  color: token('color.text.subtlest', '#6B778C'),
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <AkSearchIcon label="" />
              </span>
            }
            elemAfterInput={
              search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  style={{
                    paddingInlineEnd: 6,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: token('color.text.subtlest', '#6B778C'),
                    padding: '0 8px 0 4px',
                  }}
                >
                  <AkCloseIcon label="" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Filters — PLACEHOLDER. Non-functional in v1. */}
        <Button appearance="subtle" onClick={() => { /* TODO Task 1.5c */ }}>
          Filters
        </Button>

        {/* Avatar group — full team directory (read-only in v1). */}
        {avatarData.length > 0 && (
          <AvatarGroup
            appearance="stack"
            size="small"
            maxCount={5}
            label="Team members"
            data={avatarData}
          />
        )}

        {/* Saved filters — PLACEHOLDER. */}
        <Button appearance="subtle" onClick={() => { /* TODO Task 1.5c */ }}>
          Saved filters
        </Button>

        <div style={{ flex: 1 }} />

        {/* Group by — PLACEHOLDER native <select> (visual parity, no functional
            grouping wired yet). Project Hub uses GroupByControl portal pattern
            (overflow-hidden bug workaround). Tasks v1 doesn't need grouping. */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: token('color.text.subtlest', '#6B778C'),
          }}
        >
          <span>Group by</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            style={{
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 3,
              padding: '4px 8px',
              fontSize: 13,
              background: token('color.background.input', '#FFFFFF'),
              color: token('color.text', '#172B4D'),
              cursor: 'pointer',
            }}
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* More actions ⋯ — PLACEHOLDER. */}
        <IconButton
          appearance="subtle"
          icon={AkMoreIcon}
          label="More actions"
          onClick={() => { /* TODO Task 1.5c */ }}
        />

        {/* Item count — right-aligned. */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 32,
            padding: '0 12px',
            marginLeft: 8,
            color: token('color.text.subtlest', '#626F86'),
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {filteredRows.length} item{filteredRows.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <JiraTable<PlannerTask>
          data={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          selectable
          selection={selectedIds}
          onSelectionChange={setSelectedIds}
          columnVisibility={visibleColumns}
          onColumnVisibilityChange={setVisibleColumns}
        />
      </div>
    </div>
  );
}
