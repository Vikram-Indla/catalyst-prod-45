import { useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import { usePresence } from '@/hooks/usePresence';
import { useToast } from '@/hooks/use-toast';
import type { PresenceState } from '@/lib/presence';

// Dot colors match PRESENCE_RING exactly — same mental model on the menu as on the avatar ring.
const QUICK_SET: { label: string; state: PresenceState; color: string }[] = [
  { label: 'Available', state: 'available', color: 'var(--ds-icon-success, #22A06B)' },  // GREEN
  { label: 'Busy',      state: 'busy',      color: 'var(--ds-icon-danger, #C9372C)'  },  // RED
  { label: 'Away',      state: 'away',      color: 'var(--ds-icon-warning, #E2B203)' },  // AMBER
];

interface Props {
  onDone?: () => void;
  onScheduleLeave?: () => void;
  currentState?: PresenceState | null;
}

export function AvailabilityPanel({ onDone, onScheduleLeave, currentState }: Props) {
  const { setPresence, isPending: isPresencePending } = usePresence();
  const { toast } = useToast();

  const handleQuickSet = useCallback(
    async (state: PresenceState) => {
      await setPresence({ state });
      const label = QUICK_SET.find(q => q.state === state)?.label ?? state;
      toast({ title: `Status set to ${label}` });
      onDone?.();
    },
    [setPresence, onDone, toast]
  );

  return (
    <div className="av-panel-compact" style={{ padding: '8px 12px', minWidth: 240 }}>
        {/* Quick-set section */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
            marginBottom: 4,
          }}
        >
          Set availability
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
          {QUICK_SET.map(({ label, state, color }) => {
            const isActive = currentState === state;
            return (
              <button
                key={state}
                onClick={() => void handleQuickSet(state)}
                disabled={isPresencePending}
                aria-pressed={isActive}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  border: 'none',
                  borderRadius: 3,
                  background: isActive
                    ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FE)')
                    : 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: token('color.text', 'var(--ds-text, #172B4D)'),
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isActive
                    ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FE)')
                    : 'transparent';
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    border: 'none',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 12,
                      color: token('color.text.brand', 'var(--ds-link, #0052CC)'),
                      fontWeight: 600,
                      marginLeft: 'auto',
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule leave trigger */}
        <div
          style={{
            borderTop: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
            paddingTop: 6,
          }}
        >
          <button
            onClick={() => onScheduleLeave?.()}
            style={{
              background: 'none',
              border: 'none',
              padding: '3px 0',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 400,
              color: token('color.link', 'var(--ds-link, #0052CC)'),
              width: '100%',
              textAlign: 'left',
            }}
          >
            Schedule leave…
          </button>
        </div>
      </div>
  );
}
