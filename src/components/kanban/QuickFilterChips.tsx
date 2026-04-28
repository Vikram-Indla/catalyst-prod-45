/**
 * QuickFilterChips — Jira-parity quick filter strip.
 *
 * Mirrors Jira board 597's quick-filter row (REST evidence:
 * /rest/agile/1.0/board/597/quickfilter — 4 entries: Internal Portal, BAU,
 * Recently Updated, Assigned to me). On Catalyst:
 *
 *   • "Recently Updated"  → filters cards whose updatedAt is within last 24h.
 *   • "Assigned to me"    → filters cards assigned to the current user.
 *   • "Internal Portal"   → Jira-only (custom field "Implementation Project");
 *                            rendered as a disabled chip with a tooltip.
 *   • "BAU"               → same as above.
 *
 * The strip is purely visual; predicate evaluation lives in KanbanBoardShell
 * which composes the active filter into the colMap before the board mounts.
 */
import type { KanbanThemeTokens } from './kanban-tokens';

export type QuickFilterId =
  | 'internal_portal'
  | 'bau'
  | 'recently_updated'
  | 'assigned_to_me'
  | null;

interface QuickFilterChipsProps {
  active: QuickFilterId;
  onChange: (id: QuickFilterId) => void;
  tk: KanbanThemeTokens;
}

const CHIPS: ReadonlyArray<{
  id: Exclude<QuickFilterId, null>;
  label: string;
  jiraOnly?: boolean;
  jiraJql?: string;
}> = [
  { id: 'internal_portal',  label: 'Internal Portal', jiraOnly: true,
    jiraJql: '"Implementation Project[Dropdown]" = "MIM Internal - Implementation"' },
  { id: 'bau',              label: 'BAU', jiraOnly: true,
    jiraJql: '"Implementation Project[Dropdown]" = "Senaei BAU"' },
  { id: 'recently_updated', label: 'Recently Updated', jiraJql: 'updatedDate >= -1d' },
  { id: 'assigned_to_me',   label: 'Assigned to me', jiraJql: 'assignee = currentUser()' },
];

export function QuickFilterChips({ active, onChange, tk }: QuickFilterChipsProps) {
  return (
    <div
      data-testid="kanban-quick-filter-chips"
      role="toolbar"
      aria-label="Quick filters"
      style={{
        display: 'flex',
        gap: 6,
        padding: '0 16px 8px 16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <span style={{
        fontSize: 12, fontWeight: 500, color: tk.textMuted,
        fontFamily: 'var(--cp-font-body)', marginRight: 4,
      }}>Quick filters:</span>
      {CHIPS.map((chip) => {
        const isActive = active === chip.id;
        const isDisabled = !!chip.jiraOnly;
        return (
          <button
            key={chip.id}
            type="button"
            disabled={isDisabled}
            data-testid={`kanban-quick-filter-chip-${chip.id}`}
            data-active={isActive}
            aria-pressed={isActive}
            aria-disabled={isDisabled}
            title={isDisabled ? `Jira-only filter — JQL: ${chip.jiraJql}` : `Apply: ${chip.jiraJql}`}
            onClick={() => {
              if (isDisabled) return;
              onChange(isActive ? null : chip.id);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 24,
              padding: '0 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--cp-font-body)',
              border: `1px solid ${isActive ? '#0C66E4' : tk.borderSubtle}`,
              background: isDisabled ? '#F4F5F7' : isActive ? '#E9F2FF' : '#FFFFFF',
              color: isDisabled ? '#94A3B8' : isActive ? '#0C66E4' : tk.textPrimary,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
