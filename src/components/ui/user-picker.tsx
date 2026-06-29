/**
 * UserPicker — 2026-06-21 Phase 8.5: rewritten as a thin adapter over the
 * canonical <ProfilePicker />.
 *
 * Public API kept stable so the 6 callers (EpicDetailsViewTab,
 * ReportDefectModal, CreateEpicModal, CreateEpicDialog, EditEpicDialog,
 * OKRSmartFiltersDialog) need no code changes:
 *   - value: string | string[] | null
 *   - onChange: (string | string[] | null) => void
 *   - multiSelect, placeholder, showUnassigned, disabled
 *
 * Multi-select chips below the trigger are preserved.
 */
import { useMemo } from 'react';
import { ChevronsUpDown, User, X } from '@/lib/atlaskit-icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';

const UNASSIGNED = 'UNASSIGNED';

interface UserPickerProps {
  value?: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  multiSelect?: boolean;
  disabled?: boolean;
  className?: string;
  showUnassigned?: boolean;
}

export function UserPicker({
  value,
  onChange,
  placeholder = 'Select user...',
  multiSelect = false,
  disabled = false,
  className,
  showUnassigned = false,
}: UserPickerProps) {
  const { data: users = [] } = useActiveUsers();

  /* Build the canonical members list. The "Unassigned" pseudo-member is
     synthesized here when `showUnassigned` is on so the multi-select can
     include UNASSIGNED as a chip alongside real users (matches the legacy
     behavior). */
  const members: ProfilePickerMember[] = useMemo(
    () => {
      const real: ProfilePickerMember[] = users.map((u) => ({
        userId: u.id,
        name: u.full_name ?? u.email,
        email: u.email,
        avatarUrl: u.avatar_url ?? null,
      }));
      if (showUnassigned) {
        real.unshift({
          userId: UNASSIGNED,
          name: 'Unassigned',
          email: null,
          avatarUrl: null,
        });
      }
      return real;
    },
    [users, showUnassigned],
  );

  /* Normalize the array value once for multi mode. */
  const valueArray: string[] = Array.isArray(value) ? value : [];

  /* Resolve single-mode selection. */
  const singleSelected = useMemo<ProfilePickerSelection>(() => {
    if (multiSelect) return null;
    if (value === UNASSIGNED) {
      return { userId: UNASSIGNED, name: 'Unassigned', avatarUrl: null };
    }
    if (typeof value !== 'string') return null;
    const u = users.find((x) => x.id === value);
    return u
      ? { userId: u.id, name: u.full_name ?? u.email, email: u.email, avatarUrl: u.avatar_url ?? null }
      : null;
  }, [users, value, multiSelect]);

  const handleRemoveChip = (id: string) => {
    if (multiSelect) onChange(valueArray.filter((v) => v !== id));
    else onChange(null);
  };

  /* Resolve chips for the multi-select tray. */
  const chipMembers = useMemo(
    () => valueArray.map((id) => {
      if (id === UNASSIGNED) return { userId: UNASSIGNED, name: 'Unassigned' };
      const u = users.find((x) => x.id === id);
      return u ? { userId: u.id, name: u.full_name ?? u.email } : null;
    }).filter(Boolean) as Array<{ userId: string; name: string }>,
    [valueArray, users],
  );

  return (
    <div className={cn('space-y-2', className)}>
      <ProfilePicker
        members={members}
        fieldLabel="User"
        disabled={disabled}
        /* Single-select wiring */
        value={singleSelected}
        onChange={multiSelect ? undefined : (next) => onChange(next?.userId ?? null)}
        /* Multi-select wiring */
        selectedIds={multiSelect ? valueArray : undefined}
        onChangeMulti={multiSelect ? (next) => onChange(next.length === 0 ? null : next) : undefined}
        renderTrigger={({ onClick, ref, disabled: ppDisabled, open }) => (
          <Button
            ref={ref as any}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={ppDisabled}
            onClick={onClick as any}
            className={cn(
              'w-full justify-between font-normal h-9',
              'focus:ring-0 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-offset-0',
              !value && 'text-muted-foreground',
            )}
          >
            <TriggerContent
              multiSelect={multiSelect}
              value={value}
              singleSelected={singleSelected}
              placeholder={placeholder}
            />
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      />

      {multiSelect && chipMembers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chipMembers.map((m) => (
            <span key={m.userId} className="inline-flex items-center gap-1">
              <Lozenge appearance={m.userId === UNASSIGNED ? 'default' : 'inprogress'}>
                {m.name}
              </Lozenge>
              <button
                type="button"
                onClick={() => handleRemoveChip(m.userId)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${m.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TriggerContent({
  multiSelect,
  value,
  singleSelected,
  placeholder,
}: {
  multiSelect: boolean;
  value: string | string[] | null | undefined;
  singleSelected: ProfilePickerSelection;
  placeholder: string;
}) {
  if (multiSelect) {
    const count = Array.isArray(value) ? value.length : 0;
    return (
      <span className="text-muted-foreground">
        {count === 0 ? placeholder : `${count} selected`}
      </span>
    );
  }
  if (value === UNASSIGNED) {
    return (
      <span className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        Unassigned
      </span>
    );
  }
  if (!singleSelected) {
    return <span className="text-muted-foreground">{placeholder}</span>;
  }
  return (
    <span className="flex items-center gap-2">
      {singleSelected.avatarUrl ? (
        <img
          src={singleSelected.avatarUrl}
          alt={singleSelected.name}
          className="w-5 h-5 rounded-full object-cover"
        />
      ) : (
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: 'var(--ds-text-brand)' }}
        >
          {singleSelected.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="truncate">{singleSelected.name}</span>
    </span>
  );
}
