/**
 * ═══════════════════════════════════════════════════════════════════
 * RecipientPicker — Modal for configuring who receives a notification
 * Multi-toggle panel for each recipient type with descriptions.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { Users, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Lozenge } from '@/components/ads';
import { Separator } from '@/components/ui/separator';
import type { RecipientsConfig, TriggerRowData } from '@/types/notification-triggers';

// ── Recipient metadata ──────────────────────────────────────────
const RECIPIENT_DEFS: {
  key: keyof Omit<RecipientsConfig, 'custom_roles'>;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: 'assignee',
    label: 'Current Assignee',
    description: 'The user currently assigned to the entity',
    icon: '👤',
  },
  {
    key: 'owner',
    label: 'Owner',
    description: 'The designated owner of the entity (may differ from assignee)',
    icon: '👑',
  },
  {
    key: 'reporter',
    label: 'Reporter',
    description: 'The user who created/reported the entity',
    icon: '📝',
  },
  {
    key: 'creator',
    label: 'Creator',
    description: 'The user who originally created the entity',
    icon: '✨',
  },
  {
    key: 'watchers',
    label: 'All Watchers',
    description: 'Everyone on the entity watcher/subscriber list',
    icon: '👁',
  },
  {
    key: 'mentioned_users',
    label: '@Mentioned Users',
    description: 'Users explicitly @mentioned in comments or descriptions',
    icon: '@',
  },
  {
    key: 'team_members',
    label: 'Team Members',
    description: 'All members of the assigned team',
    icon: '👥',
  },
  {
    key: 'project_lead',
    label: 'Project Lead',
    description: 'The designated project lead or portfolio manager',
    icon: '🎯',
  },
  {
    key: 'approvers',
    label: 'Approvers',
    description: 'Designated approvers and sign-off owners',
    icon: '✅',
  },
  {
    key: 'parent_owner',
    label: 'Parent Owner',
    description: 'Owner of the parent entity (e.g. epic owner for a story)',
    icon: '🔗',
  },
  {
    key: 'previous_assignee',
    label: 'Previous Assignee',
    description: 'The user who was previously assigned (for reassignment events)',
    icon: '↩',
  },
];

// ── Props ───────────────────────────────────────────────────────
interface RecipientPickerProps {
  trigger: TriggerRowData | null;
  open: boolean;
  onClose: () => void;
  onSave: (triggerKey: string, hubSource: string, recipients: RecipientsConfig) => void;
}

export function RecipientPicker({ trigger, open, onClose, onSave }: RecipientPickerProps) {
  const [config, setConfig] = useState<RecipientsConfig>({
    assignee: false,
    owner: false,
    reporter: false,
    creator: false,
    watchers: false,
    mentioned_users: false,
    team_members: false,
    project_lead: false,
    approvers: false,
    parent_owner: false,
    previous_assignee: false,
    custom_roles: [],
  });

  // Sync state when trigger changes
  useEffect(() => {
    if (trigger) {
      setConfig({ ...trigger.recipients });
    }
  }, [trigger]);

  const handleToggle = useCallback(
    (key: keyof Omit<RecipientsConfig, 'custom_roles'>) => {
      setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const enabledCount = RECIPIENT_DEFS.filter((d) => config[d.key]).length;

  const handleSave = () => {
    if (trigger) {
      onSave(trigger.triggerKey, trigger.hubSource, config);
    }
    onClose();
  };

  if (!trigger) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold font-['Sora'] flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--ds-text-brand,#2563EB)]" />
            Recipients
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--ds-text-subtle,#475569)]">
            Configure who receives the{' '}
            <span className="font-medium text-[var(--ds-text,#0F172A)]">{trigger.displayName}</span>{' '}
            notification.
          </DialogDescription>
        </DialogHeader>

        {/* Trigger info bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--ds-surface-sunken,#F8FAFC)] rounded-md border border-[var(--bd-default,#E2E8F0)]">
          <Lozenge appearance="default">
            {trigger.hubSource}
          </Lozenge>
          <span className="text-xs text-[var(--ds-text-subtle,#475569)]">{trigger.description}</span>
        </div>

        {/* Recipient toggles */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2 -mx-1 px-1">
          {RECIPIENT_DEFS.map((def) => (
            <button
              key={def.key}
              onClick={() => handleToggle(def.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-colors duration-150 text-left ${
                config[def.key]
                  ? 'bg-[rgba(37,99,235,0.04)] border-[var(--ds-text-brand,#2563EB)]/20'
                  : 'bg-white border-[var(--bd-default,#E2E8F0)] hover:bg-[rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base flex-shrink-0 w-6 text-center">{def.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--ds-text,#0F172A)]">{def.label}</p>
                  <p className="text-[11px] text-[var(--ds-text-subtle,#475569)] truncate">{def.description}</p>
                </div>
              </div>
              <Switch
                checked={config[def.key]}
                onCheckedChange={() => handleToggle(def.key)}
                className="h-4 w-7 data-[state=checked]:bg-[var(--ds-text-brand,#2563EB)] flex-shrink-0 ml-3"
              />
            </button>
          ))}
        </div>

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <span className="text-xs text-[var(--ds-text-subtlest,#94A3B8)]">
            {enabledCount} of {RECIPIENT_DEFS.length} recipient types enabled
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[var(--ds-text-brand,#2563EB)] hover:bg-[var(--ds-background-brand-bold-hovered,#1D4ED8)] text-white text-sm"
            >
              Save Recipients
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
