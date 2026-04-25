/**
 * ═══════════════════════════════════════════════════════════════════
 * Admin — Notification Triggers Page
 * Configure which CRUD events trigger notifications, who receives
 * them, and through which channels. Benchmarked against Jira.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { Bell, Search, Filter, Download, Upload, Info, Shield, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lozenge, Tooltip } from '@/components/ads';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useFilteredTriggers,
  useCategoryGroups,
  useTriggerStats,
  useTriggerSelection,
  useToggleTrigger,
  useUpdateTriggerChannels,
  useBulkUpdateTriggers,
} from '@/hooks/useNotificationTriggers';
import { useSchemes, useExportScheme, useImportScheme } from '@/hooks/useNotificationSchemes';
import { HUB_SOURCES, type HubSource } from '@/constants/notificationEvents';
import type { TriggerCategory, TriggerFilters, ChannelsConfig, TriggerRowData } from '@/types/notification-triggers';

// ── Hub display config ──────────────────────────────────────────
const HUB_LABELS: Record<string, string> = {
  All: 'All Hubs',
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

// ── Priority badge colors ───────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-[#FFEBE6] text-[#BF2600]',
  P2: 'bg-[#FFF0B3] text-[#FF8B00]',
  P3: 'bg-[#DEEBFF] text-[#0747A6]',
  P4: 'bg-[#DFE1E6] text-[#253858]',
};

// ── Channel icons ───────────────────────────────────────────────
const CHANNEL_LABELS: Record<keyof ChannelsConfig, { label: string; short: string }> = {
  in_app: { label: 'In-App', short: 'App' },
  email: { label: 'Email', short: 'Email' },
  toast: { label: 'Toast', short: 'Toast' },
  slack: { label: 'Slack', short: 'Slack' },
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function NotificationTriggers() {
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const { filtered, filters, setFilters, isLoading, totalCount } = useFilteredTriggers();
  const groups = useCategoryGroups(filtered);
  const stats = useTriggerStats(filtered);
  const selection = useTriggerSelection();
  const { data: schemes } = useSchemes();
  const exportScheme = useExportScheme();
  const importScheme = useImportScheme();
  const toggleTrigger = useToggleTrigger();
  const updateChannels = useUpdateTriggerChannels();
  const bulkUpdate = useBulkUpdateTriggers();

  // ── Expanded accordion state ──────────────────────────────────
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(groups.map((g) => g.key)));
  }, [groups]);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  // ── Import handler ────────────────────────────────────────────
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        importScheme.mutate(data);
      } catch {
        // Invalid JSON — silently ignore
      }
    };
    input.click();
  }, [importScheme]);

  // ── Bulk action handlers ──────────────────────────────────────
  const handleBulkEnable = useCallback(() => {
    bulkUpdate.mutate({ type: 'enable_all', triggerKeys: Array.from(selection.selected) });
    selection.clearAll();
  }, [bulkUpdate, selection]);

  const handleBulkDisable = useCallback(() => {
    bulkUpdate.mutate({ type: 'disable_all', triggerKeys: Array.from(selection.selected) });
    selection.clearAll();
  }, [bulkUpdate, selection]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] font-heading tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-[#2563EB]" />
            Notification Triggers
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Configure which CRUD events trigger notifications, who receives them, and through which channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedSchemeId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportScheme.mutate(selectedSchemeId)}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleImport} className="text-xs">
            <Upload className="h-3.5 w-3.5 mr-1" />
            Import
          </Button>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        <StatsCard label="Total Triggers" value={stats.total} />
        <StatsCard label="Enabled" value={stats.enabled} variant="blue" />
        <StatsCard label="Disabled" value={stats.disabled} variant="gray" />
        <StatsCard label="Mandatory" value={stats.mandatory} variant="red" />
        <StatsCard label="Silent" value={stats.silent} variant="muted" />
        <StatsCard label="Overridden" value={stats.overridden} variant="amber" />
      </div>

      {/* ── Filters Row ──────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Search triggers by name, key, or description..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Hub filter */}
            <Select
              value={filters.hub}
              onValueChange={(v) => setFilters({ ...filters, hub: v as HubSource | 'All' })}
            >
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Hub" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Hubs</SelectItem>
                {HUB_SOURCES.map((hub) => (
                  <SelectItem key={hub} value={hub}>
                    {HUB_LABELS[hub]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select
              value={filters.category}
              onValueChange={(v) => setFilters({ ...filters, category: v as TriggerCategory | 'All' })}
            >
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="assignments">Assignments</SelectItem>
                <SelectItem value="status_changes">Status Changes</SelectItem>
                <SelectItem value="comments_mentions">Comments & Mentions</SelectItem>
                <SelectItem value="approvals_signoffs">Approvals & Sign-offs</SelectItem>
                <SelectItem value="incidents_sla">Incidents & SLA</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="strategy_okrs">Strategy & OKRs</SelectItem>
                <SelectItem value="documents_wiki">Documents & Wiki</SelectItem>
                <SelectItem value="dependencies_links">Dependencies & Links</SelectItem>
                <SelectItem value="system_ai">System & AI</SelectItem>
                <SelectItem value="releases">Releases</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="product_ideas">Product & Ideas</SelectItem>
              </SelectContent>
            </Select>

            {/* Scheme selector */}
            {schemes && schemes.length > 0 && (
              <Select
                value={selectedSchemeId ?? 'none'}
                onValueChange={(v) => setSelectedSchemeId(v === 'none' ? null : v)}
              >
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Scheme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Global Defaults</SelectItem>
                  {schemes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Quick toggles */}
            <Button
              variant={filters.enabledOnly ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setFilters({ ...filters, enabledOnly: !filters.enabledOnly })}
            >
              <Filter className="h-3 w-3 mr-1" />
              Enabled Only
            </Button>
            <Button
              variant={filters.mandatoryOnly ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setFilters({ ...filters, mandatoryOnly: !filters.mandatoryOnly })}
            >
              <Shield className="h-3 w-3 mr-1" />
              Mandatory
            </Button>
          </div>

          {/* Expand/Collapse + result count */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--bd-default, #E2E8F0)]">
            <span className="text-xs text-[#94A3B8]">
              Showing {filtered.length} of {totalCount} triggers across {groups.length} categories
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bulk Actions Bar (when items selected) ───────────────── */}
      {selection.selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-[#DEEBFF] rounded-md px-4 py-2.5 border border-[#B3D4FF]">
          <span className="text-sm font-medium text-[#0747A6]">
            {selection.selectedCount} trigger{selection.selectedCount > 1 ? 's' : ''} selected
          </span>
          <Separator orientation="vertical" className="h-5" />
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleBulkEnable}>
            <ToggleRight className="h-3 w-3 mr-1" />
            Enable All
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleBulkDisable}>
            <ToggleLeft className="h-3 w-3 mr-1" />
            Disable All
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 ml-auto" onClick={selection.clearAll}>
            Clear Selection
          </Button>
        </div>
      )}

      {/* ── Category Accordion Groups ────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-[#F1F5F9] rounded-md animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-10 w-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-sm text-[#475569]">No triggers match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Card key={group.key} className="overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  {expandedGroups.has(group.key) ? (
                    <ChevronDown className="h-4 w-4 text-[#475569]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#475569]" />
                  )}
                  <span className="text-sm font-semibold text-[#0F172A]">{group.label}</span>
                  <Lozenge appearance="default">
                    {group.enabledCount}/{group.totalCount}
                  </Lozenge>
                </div>
              </button>

              {/* Trigger Rows (expanded) */}
              {expandedGroups.has(group.key) && (
                <div className="border-t border-[var(--bd-default, #E2E8F0)]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[32px_1fr_90px_80px_52px_52px_52px_52px_48px] gap-2 px-4 py-2 bg-[#F8FAFC] text-[10px] uppercase tracking-wider font-semibold text-[#475569] border-b border-[var(--bd-default, #E2E8F0)]">
                    <div />
                    <div>Trigger</div>
                    <div>Hub</div>
                    <div>Priority</div>
                    <div className="text-center">App</div>
                    <div className="text-center">Email</div>
                    <div className="text-center">Toast</div>
                    <div className="text-center">Slack</div>
                    <div className="text-center">On</div>
                  </div>

                  {/* Rows */}
                  {group.triggers.map((trigger) => (
                    <TriggerRow
                      key={trigger.triggerKey}
                      trigger={trigger}
                      isSelected={selection.isSelected(trigger.triggerKey)}
                      onSelect={() => selection.toggle(trigger.triggerKey)}
                      onToggle={(enabled) =>
                        toggleTrigger.mutate({
                          triggerKey: trigger.triggerKey,
                          hubSource: trigger.hubSource,
                          enabled,
                        })
                      }
                      onChannelToggle={(channel, value) =>
                        updateChannels.mutate({
                          triggerKey: trigger.triggerKey,
                          hubSource: trigger.hubSource,
                          channels: { ...trigger.channels, [channel]: value },
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function StatsCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number;
  variant?: 'default' | 'blue' | 'gray' | 'red' | 'muted' | 'amber';
}) {
  const colors: Record<string, string> = {
    default: 'text-[#0F172A]',
    blue: 'text-[#2563EB]',
    gray: 'text-[#475569]',
    red: 'text-[#DC2626]',
    muted: 'text-[#94A3B8]',
    amber: 'text-[#D97706]',
  };

  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className={`text-xl font-semibold font-mono ${colors[variant]}`}>{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function TriggerRow({
  trigger,
  isSelected,
  onSelect,
  onToggle,
  onChannelToggle,
}: {
  trigger: TriggerRowData;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onChannelToggle: (channel: keyof ChannelsConfig, value: boolean) => void;
}) {
  return (
    <div
      className={`grid grid-cols-[32px_1fr_90px_80px_52px_52px_52px_52px_48px] gap-2 px-4 py-2 items-center border-b border-[#F1F5F9] hover:bg-[rgba(0,0,0,0.02)] transition-colors duration-150 ${
        isSelected ? 'bg-[rgba(37,99,235,0.04)]' : ''
      }`}
      style={{ height: 50, maxHeight: 50 }}
    >
      {/* Checkbox */}
      <div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          disabled={trigger.isMandatory}
          className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] disabled:opacity-40"
        />
      </div>

      {/* Trigger name + description */}
      <div className="min-w-0">
        <Tooltip
          position="top"
          delay={300}
          content={
            <>
              <p className="font-medium">{trigger.displayName}</p>
              <p className="text-muted-foreground mt-0.5">{trigger.description}</p>
              <p className="text-muted-foreground mt-1 font-mono text-[10px]">Key: {trigger.triggerKey}</p>
            </>
          }
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[#0F172A] truncate">
              {trigger.displayName}
            </span>
            {trigger.isMandatory && (
              <Shield className="h-3 w-3 text-[#DC2626] flex-shrink-0" />
            )}
            {trigger.isSilent && (
              <Lozenge appearance="default">
                Silent
              </Lozenge>
            )}
            {trigger.isOverridden && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] flex-shrink-0" />
            )}
          </div>
        </Tooltip>
      </div>

      {/* Hub badge */}
      <div>
        <Lozenge appearance="default">
          {HUB_LABELS[trigger.hubSource] || trigger.hubSource}
        </Lozenge>
      </div>

      {/* Priority */}
      <div>
        <Lozenge appearance={trigger.priority === 'P1' ? 'removed' : trigger.priority === 'P2' ? 'moved' : trigger.priority === 'P3' ? 'inprogress' : 'default'}>
          {trigger.priority}
        </Lozenge>
      </div>

      {/* Channel toggles */}
      {(['in_app', 'email', 'toast', 'slack'] as const).map((ch) => (
        <div key={ch} className="flex justify-center">
          <Switch
            checked={trigger.channels[ch]}
            onCheckedChange={(v) => onChannelToggle(ch, v)}
            disabled={trigger.isSilent}
            className="h-4 w-7 data-[state=checked]:bg-[#2563EB]"
          />
        </div>
      ))}

      {/* Master toggle */}
      <div className="flex justify-center">
        <Switch
          checked={trigger.enabled}
          onCheckedChange={onToggle}
          disabled={trigger.isMandatory || trigger.isSilent}
          className="h-4 w-7 data-[state=checked]:bg-[#16A34A]"
        />
      </div>
    </div>
  );
}
