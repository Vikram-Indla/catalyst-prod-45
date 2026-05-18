/**
 * ═══════════════════════════════════════════════════════════════════
 * Admin — Notification Triggers Page
 * Configure which CRUD events trigger notifications, who receives
 * them, and through which channels. Benchmarked against Jira.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import NotificationIcon from '@atlaskit/icon/core/notification';
import SearchIcon from '@atlaskit/icon/core/search';
import FilterIcon from '@atlaskit/icon/core/filter';
import DownloadIcon from '@atlaskit/icon/core/download';
import UploadIcon from '@atlaskit/icon/core/upload';
import ShieldIcon from '@atlaskit/icon/core/shield';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import Select from '@atlaskit/select';
import { Lozenge, Tooltip } from '@/components/ads';
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
import { AdminGuard } from '@/components/admin/AdminGuard';

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

// ── Channel icons ───────────────────────────────────────────────
const CHANNEL_LABELS: Record<keyof ChannelsConfig, { label: string; short: string }> = {
  in_app: { label: 'In-App', short: 'App' },
  email: { label: 'Email', short: 'Email' },
  toast: { label: 'Toast', short: 'Toast' },
  slack: { label: 'Slack', short: 'Slack' },
};

// ── Hub select options ──────────────────────────────────────────
const hubOptions = [
  { label: 'All Hubs', value: 'All' },
  ...HUB_SOURCES.map((hub) => ({ label: HUB_LABELS[hub] || hub, value: hub })),
];

const categoryOptions = [
  { label: 'All Categories', value: 'All' },
  { label: 'Assignments', value: 'assignments' },
  { label: 'Status Changes', value: 'status_changes' },
  { label: 'Comments & Mentions', value: 'comments_mentions' },
  { label: 'Approvals & Sign-offs', value: 'approvals_signoffs' },
  { label: 'Incidents & SLA', value: 'incidents_sla' },
  { label: 'Testing', value: 'testing' },
  { label: 'Strategy & OKRs', value: 'strategy_okrs' },
  { label: 'Documents & Wiki', value: 'documents_wiki' },
  { label: 'Dependencies & Links', value: 'dependencies_links' },
  { label: 'System & AI', value: 'system_ai' },
  { label: 'Releases', value: 'releases' },
  { label: 'Planning', value: 'planning' },
  { label: 'Product & Ideas', value: 'product_ideas' },
];

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

  const schemeOptions = [
    { label: 'Global Defaults', value: 'none' },
    ...(schemes?.map((s) => ({ label: s.name, value: s.id })) ?? []),
  ];

  return (
    <AdminGuard>
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight flex items-center gap-2"
            style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))', fontFamily: 'var(--cp-font-body)' }}
          >
            <span style={{ display: 'inline-flex', color: 'var(--ds-text-brand, #0C66E4)' }}><NotificationIcon label="" size="medium" /></span>
            Notification Triggers
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
            Configure which CRUD events trigger notifications, who receives them, and through which channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedSchemeId && (
            <Button
              appearance="subtle"
              onClick={() => exportScheme.mutate(selectedSchemeId)}
            >
              <span style={{ display: 'inline-flex', marginRight: 4 }}><DownloadIcon label="" size="small" /></span>
              Export
            </Button>
          )}
          <Button appearance="subtle" onClick={handleImport}>
            <span style={{ display: 'inline-flex', marginRight: 4 }}><UploadIcon label="" size="small" /></span>
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
      <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtlest, #626F86)', zIndex: 1, pointerEvents: 'none' }}><SearchIcon label="" size="small" /></span>
            <div style={{ paddingLeft: '32px' }}>
              <Textfield
                placeholder="Search triggers by name, key, or description..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: (e.target as HTMLInputElement).value })}
              />
            </div>
          </div>

          {/* Hub filter */}
          <div style={{ width: 160 }}>
            <Select
              options={hubOptions}
              value={hubOptions.find(o => o.value === filters.hub) || null}
              onChange={(opt) => opt && setFilters({ ...filters, hub: opt.value as HubSource | 'All' })}
              placeholder="Hub"
            />
          </div>

          {/* Category filter */}
          <div style={{ width: 200 }}>
            <Select
              options={categoryOptions}
              value={categoryOptions.find(o => o.value === filters.category) || null}
              onChange={(opt) => opt && setFilters({ ...filters, category: opt.value as TriggerCategory | 'All' })}
              placeholder="Category"
            />
          </div>

          {/* Scheme selector */}
          {schemes && schemes.length > 0 && (
            <div style={{ width: 180 }}>
              <Select
                options={schemeOptions}
                value={schemeOptions.find(o => o.value === (selectedSchemeId ?? 'none')) || null}
                onChange={(opt) => opt && setSelectedSchemeId(opt.value === 'none' ? null : opt.value)}
                placeholder="Scheme"
              />
            </div>
          )}

          <hr style={{ border: 'none', borderLeft: '1px solid var(--ds-border-layout, #EBECF0)', height: '24px', margin: '0' }} />

          {/* Quick toggles */}
          <Button
            appearance={filters.enabledOnly ? 'primary' : 'subtle'}
            onClick={() => setFilters({ ...filters, enabledOnly: !filters.enabledOnly })}
          >
            <span style={{ display: 'inline-flex', marginRight: 4 }}><FilterIcon label="" size="small" /></span>
            Enabled Only
          </Button>
          <Button
            appearance={filters.mandatoryOnly ? 'primary' : 'subtle'}
            onClick={() => setFilters({ ...filters, mandatoryOnly: !filters.mandatoryOnly })}
          >
            <span style={{ display: 'inline-flex', marginRight: 4 }}><ShieldIcon label="" size="small" /></span>
            Mandatory
          </Button>
        </div>

        {/* Expand/Collapse + result count */}
        <div
          className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: '1px solid var(--ds-border-layout, #EBECF0)' }}
        >
          <span className="text-xs" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>
            Showing {filtered.length} of {totalCount} triggers across {groups.length} categories
          </span>
          <div className="flex gap-2">
            <Button appearance="subtle" onClick={expandAll}>
              Expand All
            </Button>
            <Button appearance="subtle" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </div>

      {/* ── Bulk Actions Bar (when items selected) ───────────────── */}
      {selection.selectedCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-md px-4 py-2.5"
          style={{
            background: 'var(--ds-background-selected, #E9F2FF)',
            border: '1px solid var(--ds-border, #DCDFE4)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--ds-text-brand, #0C66E4)' }}>
            {selection.selectedCount} trigger{selection.selectedCount > 1 ? 's' : ''} selected
          </span>
          <hr style={{ border: 'none', borderLeft: '1px solid var(--ds-border-layout, #EBECF0)', height: '20px', margin: '0' }} />
          <Button appearance="subtle" onClick={handleBulkEnable}>
            <span style={{ display: 'inline-flex', marginRight: 4 }}><CheckCircleIcon label="" size="small" /></span>
            Enable All
          </Button>
          <Button appearance="subtle" onClick={handleBulkDisable}>
            <span style={{ display: 'inline-flex', marginRight: 4 }}><CrossCircleIcon label="" size="small" /></span>
            Disable All
          </Button>
          <div className="ml-auto">
            <Button appearance="subtle" onClick={selection.clearAll}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* ── Category Accordion Groups ────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-md animate-pulse"
              style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '48px 16px', textAlign: 'center' }}>
          <span style={{ display: 'flex', justifyContent: 'center', color: 'var(--ds-text-subtlest, #626F86)', marginBottom: 12 }}><NotificationIcon label="" size="large" /></span>
          <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>No triggers match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden"
              style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors duration-150"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral, #F7F8F9)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-3">
                  {expandedGroups.has(group.key) ? (
                    <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}><ChevronDownIcon label="" size="small" /></span>
                  ) : (
                    <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}><ChevronRightIcon label="" size="small" /></span>
                  )}
                  <span className="text-sm font-semibold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{group.label}</span>
                  <Lozenge appearance="default">
                    {group.enabledCount}/{group.totalCount}
                  </Lozenge>
                </div>
              </button>

              {/* Trigger Rows (expanded) */}
              {expandedGroups.has(group.key) && (
                <div style={{ borderTop: '1px solid var(--ds-border-layout, #EBECF0)' }}>
                  {/* Table Header */}
                  <div
                    className="grid grid-cols-[32px_1fr_90px_80px_52px_52px_52px_52px_48px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider font-semibold"
                    style={{
                      background: 'var(--ds-background-neutral, #F7F8F9)',
                      color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))',
                      borderBottom: '1px solid var(--ds-border-layout, #EBECF0)',
                    }}
                  >
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
            </div>
          ))}
        </div>
      )}
    </div>
    </AdminGuard>
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
  const colorMap: Record<string, string> = {
    default: 'var(--ds-text, var(--cp-text-primary, #172B4D))',
    blue: 'var(--ds-text-brand, #0C66E4)',
    gray: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))',
    red: 'var(--ds-text-danger, #CA3521)',
    muted: 'var(--ds-text-subtlest, #626F86)',
    amber: 'var(--ds-text-warning, #974F0C)',
  };

  return (
    <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '12px', textAlign: 'center' }}>
      <p
        className="text-xl font-semibold"
        style={{ color: colorMap[variant], fontFamily: 'var(--cp-font-mono)' }}
      >
        {value}
      </p>
      <p
        className="text-[10px] uppercase tracking-wider mt-0.5"
        style={{ color: 'var(--ds-text-subtlest, #626F86)' }}
      >
        {label}
      </p>
    </div>
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
      className="grid grid-cols-[32px_1fr_90px_80px_52px_52px_52px_52px_48px] gap-2 px-4 py-2 items-center transition-colors duration-150"
      style={{
        height: 50,
        maxHeight: 50,
        borderBottom: '1px solid var(--ds-background-neutral, #F7F8F9)',
        background: isSelected ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = isSelected ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent';
      }}
    >
      {/* Checkbox */}
      <div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          disabled={trigger.isMandatory}
          className="h-3.5 w-3.5 rounded disabled:opacity-40"
          style={{ borderColor: 'var(--ds-border, #DCDFE4)', accentColor: 'var(--ds-text-brand, #0C66E4)' }}
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
              <p style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }} className="mt-0.5">{trigger.description}</p>
              <p style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }} className="mt-1 font-mono text-[10px]">Key: {trigger.triggerKey}</p>
            </>
          }
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
              {trigger.displayName}
            </span>
            {trigger.isMandatory && (
              <span style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--ds-icon-danger, #CA3521)' }}><ShieldIcon label="" size="small" /></span>
            )}
            {trigger.isSilent && (
              <Lozenge appearance="default">
                Silent
              </Lozenge>
            )}
            {trigger.isOverridden && (
              <span
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--ds-background-brand-bold, #0C66E4)' }}
              />
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
          <Toggle
            isChecked={trigger.channels[ch]}
            onChange={() => onChannelToggle(ch, !trigger.channels[ch])}
            isDisabled={trigger.isSilent}
            label={CHANNEL_LABELS[ch].label}
            size="regular"
          />
        </div>
      ))}

      {/* Master toggle */}
      <div className="flex justify-center">
        <Toggle
          isChecked={trigger.enabled}
          onChange={() => onToggle(!trigger.enabled)}
          isDisabled={trigger.isMandatory || trigger.isSilent}
          label="Enable trigger"
          size="regular"
        />
      </div>
    </div>
  );
}
