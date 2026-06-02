import { useState, useCallback } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type LeaveKind = 'vacation' | 'public_holiday' | 'sick' | 'ooo';

const LEAVE_KIND_OPTIONS: { label: string; value: LeaveKind }[] = [
  { label: 'Vacation',        value: 'vacation'        },
  { label: 'Public holiday',  value: 'public_holiday'  },
  { label: 'Sick leave',      value: 'sick'            },
  { label: 'Out of office',   value: 'ooo'             },
];

interface FieldError {
  startsAt?: string;
  endsAt?: string;
  kind?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleLeaveModal({ isOpen, onClose }: Props) {
  const { toast } = useToast();

  const [startsAt,     setStartsAt]     = useState('');
  const [endsAt,       setEndsAt]       = useState('');
  const [kind,         setKind]         = useState<{ label: string; value: LeaveKind } | null>(null);
  const [note,         setNote]         = useState('');
  const [backupUserId, setBackupUserId] = useState<{ label: string; value: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors,       setErrors]       = useState<FieldError>({});

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
    enabled: isOpen,
  });

  const backupOptions = profiles.map(p => ({ label: p.full_name ?? p.id, value: p.id }));

  const validate = (): FieldError => {
    const e: FieldError = {};
    if (!startsAt) e.startsAt = 'Start date is required.';
    if (!endsAt)   e.endsAt   = 'End date is required.';
    if (!kind)     e.kind     = 'Leave type is required.';
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))
      e.endsAt = 'End date must be after start date.';
    return e;
  };

  const handleSubmit = useCallback(async () => {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }
    setErrors({});
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('user_availability')
        .insert({
          user_id:        user.id,
          kind:           kind!.value,
          starts_at:      new Date(startsAt).toISOString(),
          ends_at:        new Date(endsAt).toISOString(),
          note:           note || null,
          backup_user_id: backupUserId?.value ?? null,
        });

      if (insertError) throw insertError;
      toast({ title: 'Leave scheduled' });
      onClose();
    } catch (e: unknown) {
      toast({
        title: 'Failed to schedule leave',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsAt, endsAt, kind, note, backupUserId, onClose, toast]);

  if (!isOpen) return null;

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: token('color.text.subtle', '#6B778C'),
    marginBottom: 4,
  } as const;

  const errorStyle = {
    fontSize: 12,
    color: token('color.text.danger', '#AE2A19'),
    marginTop: 4,
  } as const;

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Schedule leave</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>From</label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => { setStartsAt(e.target.value); setErrors(er => ({ ...er, startsAt: undefined })); }}
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                height: 40,
                padding: '0 12px',
                border: '2px solid var(--ds-border, #DFE1E6)',
                borderRadius: 3,
                fontSize: 14,
                fontFamily: 'inherit',
                color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-surface, #FFFFFF)',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ds-link, #0052CC)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ds-border, #DFE1E6)'; }}
            />
            {errors.startsAt && <div style={errorStyle}>{errors.startsAt}</div>}
          </div>

          <div>
            <label style={labelStyle}>Until</label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => { setEndsAt(e.target.value); setErrors(er => ({ ...er, endsAt: undefined })); }}
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                height: 40,
                padding: '0 12px',
                border: '2px solid var(--ds-border, #DFE1E6)',
                borderRadius: 3,
                fontSize: 14,
                fontFamily: 'inherit',
                color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-surface, #FFFFFF)',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ds-link, #0052CC)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ds-border, #DFE1E6)'; }}
            />
            {errors.endsAt && <div style={errorStyle}>{errors.endsAt}</div>}
          </div>

          <div>
            <label style={labelStyle}>Leave type</label>
            <Select
              options={LEAVE_KIND_OPTIONS}
              value={kind}
              onChange={opt => { setKind(opt as { label: string; value: LeaveKind } | null); setErrors(e => ({ ...e, kind: undefined })); }}
              placeholder="Select type..."
              menuPortalTarget={document.body}
            />
            {errors.kind && <div style={errorStyle}>{errors.kind}</div>}
          </div>

          <div>
            <label style={labelStyle}>Note (optional)</label>
            <Textfield
              value={note}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
              placeholder="e.g. Annual leave"
            />
          </div>

          <div>
            <label style={labelStyle}>Backup contact (optional)</label>
            <Select
              options={backupOptions}
              value={backupUserId}
              onChange={opt => setBackupUserId(opt as { label: string; value: string } | null)}
              placeholder="Select backup..."
              menuPortalTarget={document.body}
              isClearable
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
        <Button appearance="primary" isLoading={isSubmitting} onClick={() => void handleSubmit()}>
          Save leave
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
