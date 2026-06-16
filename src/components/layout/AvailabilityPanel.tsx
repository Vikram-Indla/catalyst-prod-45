import { useCallback, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { usePresence } from '@/hooks/usePresence';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { PresenceState } from '@/lib/presence';
import { captureRemoteLocation } from '@/lib/presence-location';
import { setManualAwayOverride, clearManualAway } from '@/lib/geo-presence';

const QUICK_SET: { label: string; state: Exclude<PresenceState, 'on_leave'>; color: string }[] = [
  { label: 'In office', state: 'onsite', color: 'var(--ds-icon-success, #22A06B)' },
  { label: 'Remote',    state: 'remote', color: 'var(--ds-icon-information, #1D7AFC)' },
  { label: 'Away',      state: 'away',   color: 'var(--ds-icon-warning, #E2B203)' },
];

const LEAVE_KIND_LABELS: Record<string, string> = {
  vacation: 'Vacation',
  public_holiday: 'Public holiday',
  sick: 'Sick leave',
  ooo: 'Out of office',
};

interface Props {
  onDone?: () => void;
  onScheduleLeave?: () => void;
  currentState?: PresenceState | null;
}

export function AvailabilityPanel({ onDone, onScheduleLeave, currentState }: Props) {
  const { setPresence, isPending: isPresencePending } = usePresence();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);

  const { data: activeLeave } = useQuery({
    queryKey: ['active-leave'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_availability')
        .select('id, kind, starts_at, ends_at, backup_user_id')
        .eq('user_id', user.id)
        .gte('ends_at', now)
        .order('starts_at', { ascending: true });
      if (error) return null;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const handleQuickSet = useCallback(
    async (state: Exclude<PresenceState, 'on_leave'>) => {
      // Track manual Away so the heartbeat doesn't override it back to geo state.
      if (state === 'away') setManualAwayOverride();
      else clearManualAway();

      // For 'remote', ask the browser for a coarse location (permission prompt).
      // Never blocks the status change — resolves to null on denial/failure.
      const location = state === 'remote' ? await captureRemoteLocation() : null;
      await setPresence({ state, location });
      onDone?.();
    },
    [setPresence, onDone]
  );

  const hasActiveLeave = activeLeave && activeLeave.length > 0;

  const handleClearLeave = useCallback(async () => {
    if (!hasActiveLeave) return;
    setClearing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('user_availability')
        .delete()
        .eq('user_id', user.id)
        .gte('ends_at', now);
      if (error) throw error;
      catalystToast.success('Leave cleared');
      void queryClient.invalidateQueries({ queryKey: ['active-leave'] });
      void queryClient.invalidateQueries({ queryKey: ['own-presence'] });
      void queryClient.invalidateQueries({ queryKey: ['team-pulse'] });
      void queryClient.invalidateQueries({ queryKey: ['leave-history'] });
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed to clear leave');
    } finally {
      setClearing(false);
    }
  }, [hasActiveLeave, queryClient]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

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
                  padding: '8px',
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

        {/* Active leave indicator */}
        {hasActiveLeave && (
          <div
            style={{
              borderTop: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
              paddingTop: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: token('color.text.subtle', '#6B778C'),
                }}
              >
                Scheduled leave
              </span>
              <button
                onClick={() => void handleClearLeave()}
                disabled={clearing}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: token('color.text.danger', '#AE2A19'),
                  padding: '4px',
                  opacity: clearing ? 0.5 : 1,
                }}
              >
                {clearing ? 'Clearing…' : `Clear all (${activeLeave!.length})`}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {activeLeave!.map((leave) => (
                <div
                  key={leave.id}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 3,
                    background: token('color.background.information.subtle', '#E9F2FF'),
                    fontSize: 12,
                    color: token('color.text', '#172B4D'),
                  }}
                >
                  {LEAVE_KIND_LABELS[leave.kind] ?? leave.kind}
                  {' · '}
                  {formatDate(leave.starts_at)} – {formatDate(leave.ends_at)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule leave trigger */}
        <div
          style={{
            borderTop: hasActiveLeave ? 'none' : `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
            paddingTop: hasActiveLeave ? 4 : 8,
          }}
        >
          <button
            onClick={() => onScheduleLeave?.()}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
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
