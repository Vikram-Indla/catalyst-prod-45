import { useState, useCallback } from 'react';
import { DatePicker } from '@atlaskit/datetime-picker';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { usePresence } from '@/hooks/usePresence';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { PresenceState } from '@/lib/presence';

type LeaveKind = 'vacation' | 'public_holiday' | 'sick' | 'ooo';

const LEAVE_KIND_OPTIONS: { label: string; value: LeaveKind }[] = [
  { label: 'Vacation', value: 'vacation' },
  { label: 'Public holiday', value: 'public_holiday' },
  { label: 'Sick leave', value: 'sick' },
  { label: 'Out of office', value: 'ooo' },
];

const QUICK_SET: { label: string; state: PresenceState; color: string }[] = [
  { label: 'Available', state: 'available', color: 'var(--ds-link, #1868DB)' },
  { label: 'Busy',      state: 'busy',      color: 'var(--ds-text-subtlest, #6B6E76)' },
  { label: 'Away',      state: 'away',      color: 'var(--ds-link, #1868DB)' },
];

interface Props {
  onDone?: () => void;
}

export function AvailabilityPanel({ onDone }: Props) {
  const { setPresence, isPending: isPresencePending } = usePresence();

  // Leave form state
  const [showLeave, setShowLeave] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt]     = useState('');
  const [kind, setKind]         = useState<{ label: string; value: LeaveKind } | null>(null);
  const [note, setNote]         = useState('');
  const [backupUserId, setBackupUserId] = useState<{ label: string; value: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Fetch profiles for backup user picker
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-backup'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      return (data ?? []) as { id: string; full_name: string | null }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const backupOptions = profiles.map(p => ({
    label: p.full_name ?? p.id,
    value: p.id,
  }));

  const handleQuickSet = useCallback(
    async (state: PresenceState) => {
      await setPresence({ state });
      onDone?.();
    },
    [setPresence, onDone]
  );

  const handleLeaveSubmit = useCallback(async () => {
    if (!startsAt || !endsAt || !kind) {
      setError('Start date, end date, and leave type are required.');
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('End date must be after start date.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('user_availability')
        .insert({
          user_id:        user.id,
          kind:           kind.value,
          starts_at:      new Date(startsAt).toISOString(),
          ends_at:        new Date(endsAt).toISOString(),
          note:           note || null,
          backup_user_id: backupUserId?.value ?? null,
        });

      if (insertError) throw insertError;
      onDone?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to schedule leave.');
    } finally {
      setIsSubmitting(false);
    }
  }, [startsAt, endsAt, kind, note, backupUserId, onDone]);

  return (
    <div style={{ padding: '12px 16px', minWidth: 260 }}>
      {/* Quick-set section */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
          marginBottom: 8,
        }}
      >
        Set availability
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {QUICK_SET.map(({ label, state, color }) => (
          <button
            key={state}
            onClick={() => void handleQuickSet(state)}
            disabled={isPresencePending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              border: 'none',
              borderRadius: 3,
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 400,
              color: token('color.text', 'var(--ds-text, #172B4D)'),
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.background =
                'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))')
            }
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
            {label}
          </button>
        ))}
      </div>

      {/* Schedule leave toggle */}
      <div
        style={{
          borderTop: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
          paddingTop: 8,
        }}
      >
        <button
          onClick={() => setShowLeave(v => !v)}
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
          {showLeave ? 'Hide' : 'Schedule leave'}
        </button>

        {showLeave && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
                  marginBottom: 4,
                }}
              >
                From
              </label>
              <DatePicker
                value={startsAt}
                onChange={(val: string) => setStartsAt(val)}
                placeholder="Start date"
                spacing="compact"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
                  marginBottom: 4,
                }}
              >
                Until
              </label>
              <DatePicker
                value={endsAt}
                onChange={(val: string) => setEndsAt(val)}
                placeholder="End date"
                spacing="compact"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
                  marginBottom: 4,
                }}
              >
                Leave type
              </label>
              <Select
                options={LEAVE_KIND_OPTIONS}
                value={kind}
                onChange={opt => setKind(opt as { label: string; value: LeaveKind } | null)}
                placeholder="Select type..."
                spacing="compact"
                menuPortalTarget={document.body}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
                  marginBottom: 4,
                }}
              >
                Note (optional)
              </label>
              <Textfield
                value={note}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
                placeholder="e.g. Annual leave"
                isCompact
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
                  marginBottom: 4,
                }}
              >
                Backup contact (optional)
              </label>
              <Select
                options={backupOptions}
                value={backupUserId}
                onChange={opt => setBackupUserId(opt as { label: string; value: string } | null)}
                placeholder="Select backup..."
                spacing="compact"
                menuPortalTarget={document.body}
                isClearable
              />
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
                }}
              >
                {error}
              </div>
            )}

            <Button
              appearance="primary"
              isLoading={isSubmitting}
              onClick={() => void handleLeaveSubmit()}
            >
              Save leave
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
