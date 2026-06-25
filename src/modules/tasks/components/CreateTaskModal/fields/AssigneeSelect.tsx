/**
 * AssigneeSelect — Create-task form field.
 *
 * 2026-06-21: migrated from a bespoke Radix-style popover to the canonical
 * <ProfilePicker />. Keeps the parent form contract intact: `value` is the
 * selected profile UUID (`''` = unassigned), `onChange(id)` writes the id
 * string. Trigger remains a 42px form-style button so the modal layout
 * doesn't shift. Data source unchanged (profiles where approval_status=APPROVED).
 */

import { useMemo } from 'react';
import { ChevronDown, X } from '@/lib/atlaskit-icons';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection, UnassignedAvatar } from '@/components/ads';

interface Assignee {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface AssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const AVATAR_COLORS = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))', 'var(--ds-icon-information, #1D7AFC)', 'var(--ds-text-subtlest, #626F86)', 'var(--ds-background-discovery-bold, #6E5DC6)', 'var(--ds-background-warning-bold, #E2B203)'];
function getAvatarColor(name: string): string {
  const index = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
function getInitials(name: string): string {
  return (name ?? '')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function AssigneeSelect({ value, onChange, className }: AssigneeSelectProps) {
  const { data: users = [] } = useQuery({
    queryKey: ['create-task-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data as Assignee[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const members: ProfilePickerMember[] = useMemo(
    () => users.map(u => ({
      userId: u.id,
      name: u.full_name ?? u.email,
      email: u.email,
      avatarUrl: u.avatar_url ?? null,
    })),
    [users],
  );

  const selectedUser = users.find(u => u.id === value);
  const selected: ProfilePickerSelection = selectedUser
    ? {
        userId: selectedUser.id,
        name: selectedUser.full_name ?? selectedUser.email,
        email: selectedUser.email,
        avatarUrl: selectedUser.avatar_url ?? null,
      }
    : null;

  return (
    <div className={cn('relative', className)}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        Assignee
      </label>

      <ProfilePicker
        value={selected}
        onChange={(next) => onChange(next?.userId ?? '')}
        members={members}
        fieldLabel="Assignee"
        renderTrigger={({ onClick, ref, disabled, open }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'w-full h-[42px] flex items-center gap-2 px-3',
              'text-sm bg-white dark:bg-slate-900 border rounded-lg',
              'cursor-pointer transition-all',
              open
                ? 'border-blue-600 ring-2 ring-blue-600/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            {selectedUser ? (
              <>
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name ?? ''}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(selectedUser.full_name || '') }}
                  >
                    {getInitials(selectedUser.full_name || '')}
                  </div>
                )}
                <span className="text-slate-900 dark:text-slate-100 flex-1 text-left truncate">
                  {selectedUser.full_name}
                </span>
              </>
            ) : (
              <>
                <UnassignedAvatar size={24} />
                <span className="text-slate-400 flex-1 text-left">Unassigned</span>
              </>
            )}
            {value && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors inline-flex"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </span>
            )}
            <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      />
    </div>
  );
}
