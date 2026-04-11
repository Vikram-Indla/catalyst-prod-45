/**
 * ═══════════════════════════════════════════════════════════════════
 * CATALYST NOTIFICATION TRIGGER SERVICE
 * Supabase CRUD for notification trigger configs, schemes,
 * scheme rules, and project-scheme assignments.
 * ═══════════════════════════════════════════════════════════════════
 */

import { supabase, typedQuery } from '@/integrations/supabase/client';
import type {
  NotificationTriggerConfig,
  NotificationScheme,
  NotificationSchemeRule,
  ProjectNotificationScheme,
  CreateSchemeInput,
  UpdateSchemeInput,
  CreateSchemeRuleInput,
  UpdateSchemeRuleInput,
  ChannelsConfig,
  RecipientsConfig,
  TriggerBulkAction,
} from '@/types/notification-triggers';
import type { HubSource } from '@/constants/notificationEvents';

// ═══════════════════════════════════════════════════════════════════
// TRIGGER CONFIGS — Global/project-level trigger settings
// ═══════════════════════════════════════════════════════════════════

export const triggerConfigService = {
  /** Fetch all trigger configs (global scope) */
  async getAll(): Promise<NotificationTriggerConfig[]> {
    const { data, error } = await typedQuery('notification_trigger_config')
      .select('*')
      .is('project_id', null)
      .order('hub_source', { ascending: true })
      .order('category', { ascending: true });

    if (error) throw error;
    return (data || []) as NotificationTriggerConfig[];
  },

  /** Fetch trigger configs for a specific project (overrides) */
  async getByProject(projectId: string): Promise<NotificationTriggerConfig[]> {
    const { data, error } = await typedQuery('notification_trigger_config')
      .select('*')
      .eq('project_id', projectId)
      .order('hub_source', { ascending: true });

    if (error) throw error;
    return (data || []) as NotificationTriggerConfig[];
  },

  /** Fetch a single trigger config by key and hub */
  async getByKey(triggerKey: string, hubSource: HubSource, projectId?: string): Promise<NotificationTriggerConfig | null> {
    let query = typedQuery('notification_trigger_config')
      .select('*')
      .eq('trigger_key', triggerKey)
      .eq('hub_source', hubSource);

    if (projectId) {
      query = query.eq('project_id', projectId);
    } else {
      query = query.is('project_id', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as NotificationTriggerConfig | null;
  },

  /** Upsert a trigger config (create or update) */
  async upsert(config: Partial<NotificationTriggerConfig> & { trigger_key: string; hub_source: HubSource }): Promise<NotificationTriggerConfig> {
    const payload = {
      ...config,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await typedQuery('notification_trigger_config')
      .upsert(payload, { onConflict: 'trigger_key,hub_source,project_id' })
      .select()
      .single();

    if (error) throw error;
    return data as NotificationTriggerConfig;
  },

  /** Update channels for a specific trigger */
  async updateChannels(id: string, channels: ChannelsConfig): Promise<void> {
    const { error } = await typedQuery('notification_trigger_config')
      .update({ channels_config: channels, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /** Update recipients for a specific trigger */
  async updateRecipients(id: string, recipients: RecipientsConfig): Promise<void> {
    const { error } = await typedQuery('notification_trigger_config')
      .update({ recipients_config: recipients, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /** Toggle a trigger enabled/disabled */
  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    const { error } = await typedQuery('notification_trigger_config')
      .update({ default_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /** Bulk update multiple trigger configs */
  async bulkUpdate(action: TriggerBulkAction): Promise<void> {
    const { type, triggerKeys } = action;

    switch (type) {
      case 'enable_all':
        for (const key of triggerKeys) {
          await typedQuery('notification_trigger_config')
            .update({ default_enabled: true, updated_at: new Date().toISOString() })
            .eq('trigger_key', key);
        }
        break;

      case 'disable_all':
        for (const key of triggerKeys) {
          await typedQuery('notification_trigger_config')
            .update({ default_enabled: false, updated_at: new Date().toISOString() })
            .eq('trigger_key', key);
        }
        break;

      case 'set_channel':
        if (action.channel && action.channelValue !== undefined) {
          for (const key of triggerKeys) {
            const { data: existing } = await typedQuery('notification_trigger_config')
              .select('channels_config')
              .eq('trigger_key', key)
              .maybeSingle();

            if (existing) {
              const updated = { ...existing.channels_config, [action.channel]: action.channelValue };
              await typedQuery('notification_trigger_config')
                .update({ channels_config: updated, updated_at: new Date().toISOString() })
                .eq('trigger_key', key);
            }
          }
        }
        break;

      case 'set_recipients':
        if (action.recipientType && action.recipientValue !== undefined) {
          for (const key of triggerKeys) {
            const { data: existing } = await typedQuery('notification_trigger_config')
              .select('recipients_config')
              .eq('trigger_key', key)
              .maybeSingle();

            if (existing) {
              const updated = { ...existing.recipients_config, [action.recipientType]: action.recipientValue };
              await typedQuery('notification_trigger_config')
                .update({ recipients_config: updated, updated_at: new Date().toISOString() })
                .eq('trigger_key', key);
            }
          }
        }
        break;

      case 'reset_defaults':
        // Delete project-level overrides to fall back to global defaults
        for (const key of triggerKeys) {
          await typedQuery('notification_trigger_config')
            .delete()
            .eq('trigger_key', key)
            .not('project_id', 'is', null);
        }
        break;
    }
  },

  /** Delete a trigger config (used for removing project-level overrides) */
  async delete(id: string): Promise<void> {
    const { error } = await typedQuery('notification_trigger_config')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION SCHEMES — Named groupings of trigger rules
// ═══════════════════════════════════════════════════════════════════

export const schemeService = {
  /** Fetch all notification schemes */
  async getAll(): Promise<NotificationScheme[]> {
    const { data, error } = await typedQuery('notification_scheme')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as NotificationScheme[];
  },

  /** Fetch a single scheme by ID */
  async getById(id: string): Promise<NotificationScheme | null> {
    const { data, error } = await typedQuery('notification_scheme')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as NotificationScheme | null;
  },

  /** Create a new notification scheme */
  async create(input: CreateSchemeInput): Promise<NotificationScheme> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await typedQuery('notification_scheme')
      .insert({
        ...input,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as NotificationScheme;
  },

  /** Update a notification scheme */
  async update(id: string, input: UpdateSchemeInput): Promise<NotificationScheme> {
    const { data, error } = await typedQuery('notification_scheme')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as NotificationScheme;
  },

  /** Delete a notification scheme */
  async delete(id: string): Promise<void> {
    const { error } = await typedQuery('notification_scheme')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /** Clone an existing scheme with a new name */
  async clone(sourceId: string, newName: string): Promise<NotificationScheme> {
    // 1. Create the new scheme
    const newScheme = await schemeService.create({ name: newName, description: `Cloned from scheme` });

    // 2. Copy all rules from the source scheme
    const { data: sourceRules, error: rulesError } = await typedQuery('notification_scheme_rules')
      .select('*')
      .eq('scheme_id', sourceId);

    if (rulesError) throw rulesError;

    if (sourceRules && sourceRules.length > 0) {
      const newRules = sourceRules.map((rule: NotificationSchemeRule) => ({
        scheme_id: newScheme.id,
        trigger_key: rule.trigger_key,
        hub_source: rule.hub_source,
        enabled: rule.enabled,
        channels: rule.channels,
        recipients: rule.recipients,
      }));

      const { error: insertError } = await typedQuery('notification_scheme_rules')
        .insert(newRules);

      if (insertError) throw insertError;
    }

    return newScheme;
  },
};

// ═══════════════════════════════════════════════════════════════════
// SCHEME RULES — Individual trigger overrides within a scheme
// ═══════════════════════════════════════════════════════════════════

export const schemeRuleService = {
  /** Fetch all rules for a scheme */
  async getByScheme(schemeId: string): Promise<NotificationSchemeRule[]> {
    const { data, error } = await typedQuery('notification_scheme_rules')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('hub_source', { ascending: true });

    if (error) throw error;
    return (data || []) as NotificationSchemeRule[];
  },

  /** Create a new scheme rule */
  async create(input: CreateSchemeRuleInput): Promise<NotificationSchemeRule> {
    const { data, error } = await typedQuery('notification_scheme_rules')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as NotificationSchemeRule;
  },

  /** Update a scheme rule */
  async update(id: string, input: UpdateSchemeRuleInput): Promise<NotificationSchemeRule> {
    const { data, error } = await typedQuery('notification_scheme_rules')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as NotificationSchemeRule;
  },

  /** Delete a scheme rule */
  async delete(id: string): Promise<void> {
    const { error } = await typedQuery('notification_scheme_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /** Upsert a rule (create if not exists, update if exists) */
  async upsert(input: CreateSchemeRuleInput): Promise<NotificationSchemeRule> {
    const { data, error } = await typedQuery('notification_scheme_rules')
      .upsert(input, { onConflict: 'scheme_id,trigger_key,hub_source' })
      .select()
      .single();

    if (error) throw error;
    return data as NotificationSchemeRule;
  },

  /** Toggle enabled for a rule */
  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    const { error } = await typedQuery('notification_scheme_rules')
      .update({ enabled })
      .eq('id', id);

    if (error) throw error;
  },

  /** Bulk create rules for a scheme (used when initializing a scheme from defaults) */
  async bulkCreate(rules: CreateSchemeRuleInput[]): Promise<void> {
    if (rules.length === 0) return;

    const { error } = await typedQuery('notification_scheme_rules')
      .insert(rules);

    if (error) throw error;
  },

  /** Delete all rules for a scheme */
  async deleteAllForScheme(schemeId: string): Promise<void> {
    const { error } = await typedQuery('notification_scheme_rules')
      .delete()
      .eq('scheme_id', schemeId);

    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════════════
// PROJECT-SCHEME ASSIGNMENTS — Link projects to notification schemes
// ═══════════════════════════════════════════════════════════════════

export const projectSchemeService = {
  /** Fetch all project-scheme assignments */
  async getAll(): Promise<ProjectNotificationScheme[]> {
    const { data, error } = await typedQuery('project_notification_scheme')
      .select('*')
      .order('project_id', { ascending: true });

    if (error) throw error;
    return (data || []) as ProjectNotificationScheme[];
  },

  /** Get the scheme assigned to a specific project */
  async getByProject(projectId: string): Promise<ProjectNotificationScheme | null> {
    const { data, error } = await typedQuery('project_notification_scheme')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data as ProjectNotificationScheme | null;
  },

  /** Assign a scheme to a project (upsert) */
  async assign(projectId: string, schemeId: string): Promise<ProjectNotificationScheme> {
    const { data, error } = await typedQuery('project_notification_scheme')
      .upsert({ project_id: projectId, scheme_id: schemeId }, { onConflict: 'project_id' })
      .select()
      .single();

    if (error) throw error;
    return data as ProjectNotificationScheme;
  },

  /** Remove a project's scheme assignment (falls back to default) */
  async unassign(projectId: string): Promise<void> {
    const { error } = await typedQuery('project_notification_scheme')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════════════
// EXPORT/IMPORT — Scheme portability (JSON)
// ═══════════════════════════════════════════════════════════════════

export interface SchemeExport {
  scheme: Omit<NotificationScheme, 'id' | 'created_by' | 'created_at' | 'updated_at'>;
  rules: Omit<NotificationSchemeRule, 'id' | 'scheme_id' | 'created_at'>[];
  exported_at: string;
  version: '1.0';
}

export const schemeExportService = {
  /** Export a scheme and its rules as JSON */
  async exportScheme(schemeId: string): Promise<SchemeExport> {
    const scheme = await schemeService.getById(schemeId);
    if (!scheme) throw new Error('Scheme not found');

    const rules = await schemeRuleService.getByScheme(schemeId);

    return {
      scheme: {
        name: scheme.name,
        description: scheme.description,
        is_default: scheme.is_default,
      },
      rules: rules.map((r) => ({
        trigger_key: r.trigger_key,
        hub_source: r.hub_source,
        enabled: r.enabled,
        channels: r.channels,
        recipients: r.recipients,
      })),
      exported_at: new Date().toISOString(),
      version: '1.0',
    };
  },

  /** Import a scheme from JSON */
  async importScheme(data: SchemeExport): Promise<NotificationScheme> {
    // Create the scheme
    const scheme = await schemeService.create({
      name: `${data.scheme.name} (Imported)`,
      description: data.scheme.description,
    });

    // Create the rules
    if (data.rules.length > 0) {
      const rules: CreateSchemeRuleInput[] = data.rules.map((r) => ({
        scheme_id: scheme.id,
        trigger_key: r.trigger_key,
        hub_source: r.hub_source,
        enabled: r.enabled,
        channels: r.channels ?? undefined,
        recipients: r.recipients ?? undefined,
      }));

      await schemeRuleService.bulkCreate(rules);
    }

    return scheme;
  },
};
