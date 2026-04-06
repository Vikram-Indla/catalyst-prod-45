/**
 * ═══════════════════════════════════════════════════════════════════
 * TriggerRow — Single notification trigger row in the admin table
 * 36px height, inline channel toggles, priority badge, hub badge.
 * ═══════════════════════════════════════════════════════════════════
 */

import { memo } from 'react';
import { Shield, Users, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

// ── Priority badge colors (per CLAUDE.md — no HSL, hex only) ────
const PRIORITY_STYLES: Record<string, string> = {
  P1: 'bg-[#FFEBE6] text-[#BF2600] border-transparent',
  P2: 'bg-[#FFF0B3] text-[#974F0C] border-transparent',
  P3: 'bg-[#DEEBFF] text-[#0747A6] border-transparent',
  P4: 'bg-[#DFE1E6] text-[#253858] border-transparent',
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
      className={`grid grid-cols-[32px_1fr_90px_80px_52px_52px_52px_52px_48px] gap-2 px-4 items-center border-b border-[#F1F5F9] transition-colors duration-150 group ${
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
          className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] focus:ring-offset-0 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {/* ── Trigger Name + Indicators ────────────────────────────── */}
      <div className="min-w-0 flex items-center gap-1.5">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center gap-1.5 min-w-0 text-left"
                onClick={onOpenRecipients}
              >
                <span className="text-xs font-medium text-[#0F172A] truncate leading-none">
                  {displayName}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-xs">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">{displayName}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
                <div className="flex items-center gap-2 pt-1 border-t">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {triggerKey}
                  </span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {TAB_LABELS[tab] || tab}
                  </Badge>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Mandatory lock */}
        {isMandatory && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Shield className="h-3 w-3 text-[#DC2626] flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Mandatory — cannot be disabled by users
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Silent badge */}
        {isSilent && (
          <Badge
            variant="outline"
            className="text-[8px] h-3.5 px-1 border-[#CBD5E1] text-[#94A3B8] leading-none"
          >
            SILENT
          </Badge>
        )}

        {/* Override indicator dot */}
        {isOverridden && !isMandatory && !isSilent && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Overridden from defaults
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Recipients button (visible on hover) */}
        <button
          onClick={onOpenRecipients}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-auto flex-shrink-0"
          title="Edit recipients"
        >
          <Users className="h-3 w-3 text-[#94A3B8] hover:text-[#2563EB]" />
        </button>
      </div>

      {/* ── Hub Badge ────────────────────────────────────────────── */}
      <div>
        <Badge
          variant="outline"
          className="text-[9px] h-5 px-1.5 font-medium border-[var(--bd-default, #E2E8F0)] text-[#475569] whitespace-nowrap"
        >
          {HUB_LABELS[hubSource] || hubSource}
        </Badge>
      </div>

      {/* ── Priority Badge ───────────────────────────────────────── */}
      <div>
        <Badge
          className={`text-[9px] h-5 px-1.5 font-bold border ${PRIORITY_STYLES[priority]}`}
        >
          {priority}
        </Badge>
      </div>

      {/* ── Channel Toggles (in_app, email, toast, slack) ────────── */}
      {(['in_app', 'email', 'toast', 'slack'] as const).map((ch) => (
        <div key={ch} className="flex justify-center">
          <Switch
            checked={channels[ch]}
            onCheckedChange={(v) => onChannelToggle(ch, v)}
            disabled={isSilent || !enabled}
            className="h-4 w-7 data-[state=checked]:bg-[#2563EB] disabled:opacity-30"
          />
        </div>
      ))}

      {/* ── Master Enable Toggle ─────────────────────────────────── */}
      <div className="flex justify-center">
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={isMandatory || isSilent}
          className="h-4 w-7 data-[state=checked]:bg-[#16A34A] disabled:opacity-30"
        />
      </div>
    </div>
  );
});
