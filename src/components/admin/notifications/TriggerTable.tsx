/**
 * ═══════════════════════════════════════════════════════════════════
 * TriggerTable — Accordion table of notification trigger categories
 * Renders grouped triggers with expand/collapse and inline editing.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Shield, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TriggerRow } from './TriggerRow';
import type { TriggerCategoryGroup, TriggerRowData, ChannelsConfig } from '@/types/notification-triggers';
import type { HubSource } from '@/constants/notificationEvents';

// ── Props ───────────────────────────────────────────────────────
interface TriggerTableProps {
  groups: TriggerCategoryGroup[];
  expandedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  selectedTriggers: Set<string>;
  onSelectTrigger: (key: string) => void;
  onToggleEnabled: (triggerKey: string, hubSource: HubSource, enabled: boolean) => void;
  onChannelToggle: (triggerKey: string, hubSource: HubSource, channels: ChannelsConfig) => void;
  onOpenRecipients: (trigger: TriggerRowData) => void;
}

export function TriggerTable({
  groups,
  expandedGroups,
  onToggleGroup,
  selectedTriggers,
  onSelectTrigger,
  onToggleEnabled,
  onChannelToggle,
  onOpenRecipients,
}: TriggerTableProps) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <CategoryAccordion
          key={group.key}
          group={group}
          isExpanded={expandedGroups.has(group.key)}
          onToggle={() => onToggleGroup(group.key)}
          selectedTriggers={selectedTriggers}
          onSelectTrigger={onSelectTrigger}
          onToggleEnabled={onToggleEnabled}
          onChannelToggle={onChannelToggle}
          onOpenRecipients={onOpenRecipients}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Category Accordion
// ═══════════════════════════════════════════════════════════════════

interface CategoryAccordionProps {
  group: TriggerCategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedTriggers: Set<string>;
  onSelectTrigger: (key: string) => void;
  onToggleEnabled: (triggerKey: string, hubSource: HubSource, enabled: boolean) => void;
  onChannelToggle: (triggerKey: string, hubSource: HubSource, channels: ChannelsConfig) => void;
  onOpenRecipients: (trigger: TriggerRowData) => void;
}

function CategoryAccordion({
  group,
  isExpanded,
  onToggle,
  selectedTriggers,
  onSelectTrigger,
  onToggleEnabled,
  onChannelToggle,
  onOpenRecipients,
}: CategoryAccordionProps) {
  const mandatoryCount = useMemo(
    () => group.triggers.filter((t) => t.isMandatory).length,
    [group.triggers]
  );

  const silentCount = useMemo(
    () => group.triggers.filter((t) => t.isSilent).length,
    [group.triggers]
  );

  // Select all non-mandatory triggers in this group
  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent) => {
      e.stopPropagation();
      for (const t of group.triggers) {
        if (!t.isMandatory && !selectedTriggers.has(t.triggerKey)) {
          onSelectTrigger(t.triggerKey);
        }
      }
    },
    [group.triggers, selectedTriggers, onSelectTrigger]
  );

  return (
    <Card className="overflow-hidden border-[var(--bd-default, rgba(255,255,255,0.10))]">
      {/* ── Category Header ──────────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(0,0,0,0.02)] transition-colors duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[#475569] flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#475569] flex-shrink-0" />
          )}

          <span className="text-sm font-semibold text-[rgba(237,237,237,0.93)] font-['Inter']">
            {group.label}
          </span>

          {/* Enabled / Total badge */}
          <Badge
            variant="secondary"
            className="text-[10px] h-5 px-1.5 bg-[#1A1A1A] text-[#475569] font-['JetBrains_Mono']"
          >
            {group.enabledCount}/{group.totalCount}
          </Badge>

          {/* Mandatory indicator */}
          {mandatoryCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-[#DC2626]">
              <Shield className="h-3 w-3" />
              <span>{mandatoryCount} mandatory</span>
            </div>
          )}

          {/* Silent indicator */}
          {silentCount > 0 && (
            <span className="text-[10px] text-[rgba(237,237,237,0.40)]">
              {silentCount} silent
            </span>
          )}
        </div>

        {/* Right side — progress bar */}
        <div className="flex items-center gap-3">
          <div className="w-24 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
              style={{ width: `${group.totalCount > 0 ? (group.enabledCount / group.totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-[rgba(237,237,237,0.40)] w-8 text-right font-['JetBrains_Mono']">
            {group.totalCount > 0 ? Math.round((group.enabledCount / group.totalCount) * 100) : 0}%
          </span>
        </div>
      </button>

      {/* ── Expanded Content ─────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-[var(--bd-default, rgba(255,255,255,0.10))]">
          {/* Column Headers */}
          <div className="grid grid-cols-[32px_1fr_90px_80px_52px_52px_52px_52px_48px] gap-2 px-4 py-2 bg-[#1A1A1A] border-b border-[var(--bd-default, rgba(255,255,255,0.10))]">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                className="h-3 w-3 rounded border-[rgba(237,237,237,0.53)] text-[#2563EB]"
                title="Select all in group"
              />
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569]">
              Trigger
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569]">
              Hub
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569]">
              Priority
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569] text-center">
              App
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569] text-center">
              Email
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569] text-center">
              Toast
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569] text-center">
              Slack
            </div>
            <div className="text-[10px] uppercase tracking-[0.03em] font-semibold text-[#475569] text-center">
              On
            </div>
          </div>

          {/* Trigger Rows */}
          {group.triggers.map((trigger) => (
            <TriggerRow
              key={trigger.triggerKey}
              trigger={trigger}
              isSelected={selectedTriggers.has(trigger.triggerKey)}
              onSelect={() => onSelectTrigger(trigger.triggerKey)}
              onToggle={(enabled) => onToggleEnabled(trigger.triggerKey, trigger.hubSource, enabled)}
              onChannelToggle={(channel, value) =>
                onChannelToggle(trigger.triggerKey, trigger.hubSource, {
                  ...trigger.channels,
                  [channel]: value,
                })
              }
              onOpenRecipients={() => onOpenRecipients(trigger)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
