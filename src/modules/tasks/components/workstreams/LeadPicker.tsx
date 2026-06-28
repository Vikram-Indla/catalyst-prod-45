// ============================================================================
// LEAD PICKER — Workstream lead assignment.
//
// 2026-06-21 Phase 8: migrated to the canonical <ProfilePicker />. Trigger
// preserves the workstream-color avatar circle via `renderTrigger`. No lock
// rule — workstream lead reassignment is a routine ops task, not a
// work-item assignee field.
// ============================================================================

import { useMemo } from 'react';
import { ChevronDown, User } from '@/lib/atlaskit-icons';
import { useResourceInventory } from '../../hooks/useResourceInventory';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { cn } from '@/lib/utils';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';

interface LeadPickerProps {
  value: string | null;  // Current lead ID (resource_inventory.id)
  currentLeadInfo?: { id: string; name: string; initials?: string } | null;
  workstreamColor?: string;
  workstreamName?: string;
  onChange: (leadId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const getInitials = (name: string | null): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const colors = ['var(--ds-text-brand)', 'var(--ds-background-discovery-bold)', 'var(--ds-background-accent-magenta-bolder)', 'var(--ds-icon-information)', 'var(--ds-text-warning)', 'var(--ds-background-discovery-bold)', 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function LeadPicker({
  value,
  currentLeadInfo,
  workstreamColor,
  workstreamName,
  onChange,
  placeholder = 'Assign lead...',
  disabled = false,
  className
}: LeadPickerProps) {
  const { data: resources = [] } = useResourceInventory();

  const members: ProfilePickerMember[] = useMemo(
    () => resources.map((r) => ({
      userId: r.id,
      name: r.name,
      email: r.email,
      avatarUrl: null,
    })),
    [resources],
  );

  const displayLead = useMemo(() => {
    if (value) {
      const found = resources.find(r => r.id === value);
      if (found) return { id: found.id, name: found.name, initials: found.initials };
    }
    return currentLeadInfo || null;
  }, [value, resources, currentLeadInfo]);

  const wsColors = workstreamName ? getWorkstreamColor(workstreamName) : null;
  const avatarColor = workstreamColor || wsColors?.hex || (displayLead ? getColorFromName(displayLead.name) : 'var(--ds-text-subtlest)');

  const selected: ProfilePickerSelection = displayLead
    ? { userId: displayLead.id, name: displayLead.name, avatarUrl: null }
    : null;

  return (
    <ProfilePicker
      value={selected}
      onChange={(next) => onChange(next?.userId ?? null)}
      members={members}
      fieldLabel="Lead"
      disabled={disabled}
      renderTrigger={({ onClick, ref, disabled: ppDisabled }) => (
        <button
          ref={ref}
          type="button"
          disabled={ppDisabled}
          onClick={(e) => { if (ppDisabled) return; e.stopPropagation(); onClick(e); }}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border',
            'bg-background hover:bg-muted/50 transition-colors text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            ppDisabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          {displayLead ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {displayLead.initials || getInitials(displayLead.name)}
              </div>
              <span className="text-foreground">{displayLead.name}</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{placeholder}</span>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
        </button>
      )}
    />
  );
}
