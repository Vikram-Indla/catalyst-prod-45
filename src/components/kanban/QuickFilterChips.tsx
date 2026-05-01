/**
 * QuickFilterChips — Catalyst-canonical quick filter strip.
 *
 * Mirrors Jira board 597's quick-filter UX shape, but only with chips
 * Catalyst can evaluate against its own data. The Jira-only chips
 * ("Internal Portal", "BAU") that depended on the
 * "Implementation Project[Dropdown]" custom field have been retired —
 * Catalyst doesn't carry that field and provenance-style filtering is
 * out of scope now that Catalyst owns the dataset.
 *
 *   • "Recently Updated"  → filters cards whose updatedAt is within last 24h.
 *   • "Assigned to me"    → filters cards assigned to the current user.
 *
 * The strip is purely visual; predicate evaluation lives in KanbanBoardShell
 * which composes the active filter into the colMap before the board mounts.
 */
import type { KanbanThemeTokens } from './kanban-tokens';

/**
 * `internal_portal` and `bau` retained in the union for backwards
 * compatibility with KanbanBoardShell's exhaustiveness check + any URL-
 * persisted filter state. The chips themselves no longer render, so
 * those values can never be set from the UI; only legacy bookmarked
 * URLs would carry them, and the predicate is a passthrough no-op.
 */
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
  description?: string;
}> = [
  { id: 'recently_updated', label: 'Recently Updated', description: 'Updated in last 24h' },
  { id: 'assigned_to_me',   label: 'Assigned to me',   description: 'Where I am the assignee' },
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
        return (
          <button
            key={chip.id}
            type="button"
            data-testid={`kanban-quick-filter-chip-${chip.id}`}
            data-active={isActive}
            aria-pressed={isActive}
            title={chip.description ?? chip.label}
            onClick={() => onChange(isActive ? null : chip.id)}
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
              background: isActive ? '#E9F2FF' : 'var(--ds-surface, #FFFFFF)',
              color: isActive ? '#0C66E4' : tk.textPrimary,
              cursor: 'pointer',
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
