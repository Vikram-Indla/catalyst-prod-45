/**
 * ═══════════════════════════════════════════════════════════════════
 * TriggerRow — Single notification trigger row in the admin table
 * 36px height, inline channel toggles, priority badge, hub badge.
 * ═══════════════════════════════════════════════════════════════════
 */

import { memo } from 'react';
import { Shield, Users, Eye } from 'lucide-react';
import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';
import { Switch } from '@/components/ui/switch';
import type { TriggerRowData, ChannelsConfig } from '@/types/notification-triggers';

// ── Hub labels ──────────────────────────────────────────────────
const HUB_LABELS: Record<string, string> = {
  StrategyHub: 'Strategy',
  ProductHub: 'Product',
  ProjectHub: 'Project',
  ReleaseHub: 'Release',
  TestHub: 'Test',
  IncidentHub: 'Incident',
  TaskHub: 'Task',
  PlanHub: 'Plan',
  WikiHub: 'Wiki',
  CrossHub: 'Cross-Hub',
};

// ── Priority → Lozenge appearance (per CLAUDE.md guardrails) ────
const PRIORITY_APPEARANCE: Record<string, LozengeAppearance> = {
  P1: 'removed',
  P2: 'moved',
  P3: 'inprogress',
  P4: 'default',
};

// ── Tab route labels ────────────────────────────────────────────
const TAB_LABELS: Record<string, string> = {
  direct: 'Direct',
  watching: 'Watching',
  ai: 'AI Digest',
  'direct/watching': 'Direct + Watching',
};

// ── Props ───────────────────────────────────────────────────────
interface TriggerRowProps {
  trigger: TriggerRowData;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onChannelToggle: (channel: keyof ChannelsConfig, value: boolean) => void;
  onOpenRecipients: () => void;
}

export const TriggerRow = memo(function TriggerRow({
  trigger,
  isSelected,
  onSelect,
  onToggle,
  onChannelToggle,
  onOpenRecipients,
}: TriggerRowProps) {
  const {
    triggerKey,
    displayName,
    description,
    hubSource,
    priority,
    isMandatory,
    isSilent,
    isOverridden,
    tab,
    channels,
    enabled,
  } = trigger;

  return (
    <div
      className={`grid grid-cols-[32px_1fr_90px_80px_52px_52px_52px_52px_48px] gap-2 px-4 items-center border-b border-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F1F5F9))] transition-colors duration-150 group ${
        isSelected
          ? 'bg-[rgba(37,99,235,0.04)]'
          : 'hover:bg-[rgba(0,0,0,0.02)]'
      }`}
      style={{ height: 50, maxHeight: 50 }}
    >
      {/* ── Checkbox ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          disabled={isMandatory}
          className="h-3.5 w-3.5 rounded border-[var(--ds-text-disabled,var(--ds-text-disabled, #CBD5E1))] text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] focus:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] focus:ring-offset-0 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {/* ── Trigger Name + Indicators ────────────────────────────── */}
      <div className="min-w-0 flex items-center gap-1.5">
        <Tooltip
          delay={200}
          position="top-start"
          content={
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">{displayName}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
              <div className="flex items-center gap-2 pt-1 border-t">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {triggerKey}
                </span>
                <Lozenge appearance="default">
                  {TAB_LABELS[tab] || tab}
                </Lozenge>
              </div>
            </div>
          }
        >
          <button
            className="flex items-center gap-1.5 min-w-0 text-left"
            onClick={onOpenRecipients}
          >
            <span className="text-xs font-medium text-[var(--ds-text,var(--ds-text, #0F172A))] truncate leading-none">
              {displayName}
            </span>
          </button>
        </Tooltip>

        {/* Mandatory lock */}
        {isMandatory && (
          <Tooltip delay={200} content="Mandatory — cannot be disabled by users">
            <Shield className="h-3 w-3 text-[var(--ds-text-danger,var(--ds-text-danger, #DC2626))] flex-shrink-0" />
          </Tooltip>
        )}

        {/* Silent badge */}
        {isSilent && (
          <Lozenge appearance="default">
            SILENT
          </Lozenge>
        )}

        {/* Override indicator dot */}
        {isOverridden && !isMandatory && !isSilent && (
          <Tooltip delay={200} content="Overridden from defaults">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] flex-shrink-0" />
          </Tooltip>
        )}

        {/* Recipients button (visible on hover) */}
        <button
          onClick={onOpenRecipients}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-auto flex-shrink-0"
          title="Edit recipients"
        >
          <Users className="h-3 w-3 text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))] hover:text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />
        </button>
      </div>

      {/* ── Hub Badge ────────────────────────────────────────────── */}
      <div>
        <Lozenge appearance="default">
          {HUB_LABELS[hubSource] || hubSource}
        </Lozenge>
      </div>

      {/* ── Priority Badge ───────────────────────────────────────── */}
      <div>
        <Lozenge appearance={PRIORITY_APPEARANCE[priority] ?? 'default'}>
          {priority}
        </Lozenge>
      </div>

      {/* ── Channel Toggles (in_app, email, toast, slack) ────────── */}
      {(['in_app', 'email', 'toast', 'slack'] as const).map((ch) => (
        <div key={ch} className="flex justify-center">
          <Switch
            checked={channels[ch]}
            onCheckedChange={(v) => onChannelToggle(ch, v)}
            disabled={isSilent || !enabled}
            className="h-4 w-7 data-[state=checked]:bg-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] disabled:opacity-30"
          />
        </div>
      ))}

      {/* ── Master Enable Toggle ─────────────────────────────────── */}
      <div className="flex justify-center">
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={isMandatory || isSilent}
          className="h-4 w-7 data-[state=checked]:bg-[var(--ds-text-success,var(--ds-text-success, #16A34A))] disabled:opacity-30"
        />
      </div>
    </div>
  );
});
