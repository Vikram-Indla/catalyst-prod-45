/**
 * ═══════════════════════════════════════════════════════════════════
 * useNotificationTriggers — React Query hooks for admin trigger mgmt
 * ═══════════════════════════════════════════════════════════════════
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerConfigService } from '@/services/notificationTriggerService';
import {
  ALL_NOTIFICATION_EVENTS,
  type HubSource,
  type NotificationEventDef,
} from '@/constants/notificationEvents';
import {
  recipientTypesToConfig,
  channelsToConfig,
  type TriggerRowData,
  type TriggerCategoryGroup,
  type TriggerFilters,
  type TriggerBulkAction,
  type ChannelsConfig,
  type RecipientsConfig,
  type NotificationTriggerConfig,
} from '@/types/notification-triggers';
import { useMemo, useState, useCallback } from 'react';

// ── Query Keys ──────────────────────────────────────────────────
const KEYS = {
  all: ['notification-triggers'] as const,
  configs: ['notification-triggers', 'configs'] as const,
  configsProject: (pid: string) => ['notification-triggers', 'configs', pid] as const,
};

// ═══════════════════════════════════════════════════════════════════
// FETCH — Global trigger configs
// ═══════════════════════════════════════════════════════════════════

export function useGlobalTriggerConfigs() {
  return useQuery({
    queryKey: KEYS.configs,
    queryFn: triggerConfigService.getAll,
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════
// FETCH — Project-level trigger configs (overrides)
// ═══════════════════════════════════════════════════════════════════

export function useProjectTriggerConfigs(projectId: string | null) {
  return useQuery({
    queryKey: KEYS.configsProject(projectId ?? ''),
    queryFn: () => triggerConfigService.getByProject(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════
// MERGED VIEW — Combine registry defaults with DB overrides
// ═══════════════════════════════════════════════════════════════════

export function useTriggerRowData(projectId?: string | null) {
  const { data: globalConfigs, isLoading: loadingGlobal } = useGlobalTriggerConfigs();
  const { data: projectConfigs, isLoading: loadingProject } = useProjectTriggerConfigs(projectId ?? null);

  const rows = useMemo<TriggerRowData[]>(() => {
    const configMap = new Map<string, NotificationTriggerConfig>();

    // Index global configs by trigger_key
    if (globalConfigs) {
      for (const c of globalConfigs) {
        configMap.set(`${c.trigger_key}::${c.hub_source}`, c);
      }
    }

    // Overlay project configs (if any)
    if (projectConfigs) {
      for (const c of projectConfigs) {
        configMap.set(`${c.trigger_key}::${c.hub_source}`, c);
      }
    }

    return ALL_NOTIFICATION_EVENTS.map((evt: NotificationEventDef): TriggerRowData => {
      const key = `${evt.triggerKey}::${evt.hubSource}`;
      const dbConfig = configMap.get(key);

      if (dbConfig) {
        return {
          triggerKey: evt.triggerKey,
          displayName: dbConfig.display_name || evt.displayName,
          description: dbConfig.description || evt.description,
          hubSource: evt.hubSource,
          category: evt.category,
          priority: evt.priority,
          entityType: evt.entityType,
          isMandatory: evt.isMandatory,
          isSilent: evt.isSilent,
          tab: evt.tab,
          enabled: evt.isMandatory ? true : dbConfig.default_enabled,
          channels: dbConfig.channels_config || channelsToConfig(evt.channels),
          recipients: dbConfig.recipients_config || recipientTypesToConfig(evt.recipients),
          isOverridden: true,
          ruleId: dbConfig.id,
        };
      }

      // No DB config — use registry defaults
      return {
        triggerKey: evt.triggerKey,
        displayName: evt.displayName,
        description: evt.description,
        hubSource: evt.hubSource,
        category: evt.category,
        priority: evt.priority,
        entityType: evt.entityType,
        isMandatory: evt.isMandatory,
        isSilent: evt.isSilent,
        tab: evt.tab,
        enabled: evt.defaultEnabled,
        channels: channelsToConfig(evt.channels),
        recipients: recipientTypesToConfig(evt.recipients),
        isOverridden: false,
        ruleId: null,
      };
    });
  }, [globalConfigs, projectConfigs]);

  return {
    rows,
    isLoading: loadingGlobal || loadingProject,
  };
}

// ═══════════════════════════════════════════════════════════════════
// FILTERS — Client-side filtering of trigger rows
// ═══════════════════════════════════════════════════════════════════

export function useFilteredTriggers(projectId?: string | null) {
  const { rows, isLoading } = useTriggerRowData(projectId);
  const [filters, setFilters] = useState<TriggerFilters>({
    hub: 'All',
    category: 'All',
    search: '',
    enabledOnly: false,
    mandatoryOnly: false,
  });

  const filtered = useMemo(() => {
    let result = rows;

    if (filters.hub !== 'All') {
      result = result.filter((r) => r.hubSource === filters.hub);
    }
    if (filters.category !== 'All') {
      result = result.filter((r) => r.category === filters.category);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.triggerKey.toLowerCase().includes(q)
      );
    }
    if (filters.enabledOnly) {
      result = result.filter((r) => r.enabled);
    }
    if (filters.mandatoryOnly) {
      result = result.filter((r) => r.isMandatory);
    }

    return result;
  }, [rows, filters]);

  return { filtered, filters, setFilters, isLoading, totalCount: rows.length };
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY GROUPS — Group filtered triggers by category
// ═══════════════════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
  assignments: 'Assignments',
  status_changes: 'Status Changes',
  comments_mentions: 'Comments & Mentions',
  approvals_signoffs: 'Approvals & Sign-offs',
  incidents_sla: 'Incidents & SLA',
  testing: 'Testing',
  strategy_okrs: 'Strategy & OKRs',
  documents_wiki: 'Documents & Wiki',
  dependencies_links: 'Dependencies & Links',
  system_ai: 'System & AI',
  releases: 'Releases',
  planning: 'Planning',
  product_ideas: 'Product & Ideas',
};

export function useCategoryGroups(triggers: TriggerRowData[]): TriggerCategoryGroup[] {
  return useMemo(() => {
    const groupMap = new Map<string, TriggerRowData[]>();

    for (const t of triggers) {
      const group = groupMap.get(t.category) || [];
      group.push(t);
      groupMap.set(t.category, group);
    }

    return Array.from(groupMap.entries()).map(([key, items]) => ({
      key: key as any,
      label: CATEGORY_LABELS[key] || key,
      triggers: items,
      enabledCount: items.filter((i) => i.enabled).length,
      totalCount: items.length,
      isExpanded: false,
    }));
  }, [triggers]);
}

// ═══════════════════════════════════════════════════════════════════
// MUTATIONS — Toggle, update channels/recipients, bulk actions
// ═══════════════════════════════════════════════════════════════════

export function useToggleTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ triggerKey, hubSource, enabled }: { triggerKey: string; hubSource: HubSource; enabled: boolean }) => {
      return triggerConfigService.upsert({
        trigger_key: triggerKey,
        hub_source: hubSource,
        default_enabled: enabled,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateTriggerChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ triggerKey, hubSource, channels }: { triggerKey: string; hubSource: HubSource; channels: ChannelsConfig }) => {
      return triggerConfigService.upsert({
        trigger_key: triggerKey,
        hub_source: hubSource,
        channels_config: channels,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateTriggerRecipients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ triggerKey, hubSource, recipients }: { triggerKey: string; hubSource: HubSource; recipients: RecipientsConfig }) => {
      return triggerConfigService.upsert({
        trigger_key: triggerKey,
        hub_source: hubSource,
        recipients_config: recipients,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useBulkUpdateTriggers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: TriggerBulkAction) => triggerConfigService.bulkUpdate(action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// SELECTION STATE — Track selected triggers for bulk actions
// ═══════════════════════════════════════════════════════════════════

export function useTriggerSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((triggerKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(triggerKey)) {
        next.delete(triggerKey);
      } else {
        next.add(triggerKey);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((keys: string[]) => {
    setSelected(new Set(keys));
  }, []);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((key: string) => selected.has(key), [selected]);

  return {
    selected,
    selectedCount: selected.size,
    toggle,
    selectAll,
    clearAll,
    isSelected,
  };
}

// ═══════════════════════════════════════════════════════════════════
// STATS — Summary counts for the admin dashboard header
// ═══════════════════════════════════════════════════════════════════

export function useTriggerStats(rows: TriggerRowData[]) {
  return useMemo(() => {
    const total = rows.length;
    const enabled = rows.filter((r) => r.enabled).length;
    const disabled = rows.filter((r) => !r.enabled && !r.isSilent).length;
    const mandatory = rows.filter((r) => r.isMandatory).length;
    const silent = rows.filter((r) => r.isSilent).length;
    const overridden = rows.filter((r) => r.isOverridden).length;

    const byHub: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const r of rows) {
      byHub[r.hubSource] = (byHub[r.hubSource] || 0) + 1;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    }

    return { total, enabled, disabled, mandatory, silent, overridden, byHub, byCategory, byPriority };
  }, [rows]);
}
