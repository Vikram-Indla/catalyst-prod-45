/**
 * BrActivitySection — APPROVED ADAPTER (not a fork).
 *
 * Per CLAUDE.md `REUSE FIRST` carve-out (2026-06-21 Phase 3 assessment):
 * mounts the canonical `ActivityPanel` UI primitive from
 * `@/components/catalyst-ds` (same surface used by every issue type —
 * tabs, composer, Jira-parity comment toolbar). Only the data layer is
 * BR-specific.
 *
 * Canonical `CatalystActivitySection` (the Story-side wrapper around
 * ActivityPanel) is hardwired to `ph_comments` / `ph_activity_log` /
 * `ph_comment_reactions` with no `dataSource` knob. Extending it to
 * accept BR's `business_request_discussions` / `business_request_audit_logs`
 * would require a non-trivial query-layer + mutation-layer rewrite affecting
 * all 8+ CatalystView* surfaces. Adapter wrapper here is the right reuse
 * level until canonical CatalystActivitySection gains a dataSource knob.
 *
 * Thin BR-side data adapter that mounts the canonical `ActivityPanel`
 * UI primitive (same surface used by every issue type — tabs, composer,
 * Jira-parity comment toolbar). The adapter pattern mirrors
 * BrDescriptionSection: BRs live in a separate set of tables, so the
 * canonical CatalystActivitySection (hard-wired to ph_issues /
 * ph_comments / ph_activity_log / ph_comment_reactions) cannot be
 * reused directly.
 *
 * Data tables (keyed on business_requests.id):
 *   - business_request_discussions  → Comments tab + All tab comment rows
 *     (columns: id, business_request_id, message, user_id,
 *      created_at, updated_at)
 *   - business_request_audit_logs   → History tab + All tab change rows
 *     (columns: id, business_request_id, action, actor_id, actor_name,
 *      field_changed, old_value, new_value, created_at — written by
 *      logBrAudit() in src/hooks/useBusinessRequests.ts on every update)
 *
 * NOT used here (legacy initiative model, FK to ph_requests):
 *   - ph_request_comments / ph_request_audit_log
 *
 * Out of scope for BR (no schema backing — same as Jira's BR view):
 *   - Reactions (no business_request_discussion_reactions table)
 *   - Reply threading (no parent_id on business_request_discussions)
 *   - Work log (no BR work-log model — tab renders empty,
 *               matching a ticket with zero logged entries)
 *   - Comments AI summarisation (BR uses a separate AI flow)
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';
import { ActivityPanel } from '@/components/catalyst-ds';
import type {
  CdsComment,
  CdsActivityItem,
  CdsUser,
  CdsQuickReply,
} from '@/components/catalyst-ds';
import { resolveAvatarUrl } from '@/lib/avatars';
import {
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';

interface BrActivitySectionProps {
  /** business_requests.id (UUID). When null/empty, the section
   *  renders disabled — same pattern as CatalystActivitySection
   *  while it waits for resolvedWorkItemId. */
  requestId: string;
  isOpen: boolean;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Status update...', template: 'Status update: ' },
  { label: 'Thanks...', template: 'Thanks for the update. ' },
  { label: 'Agree...', template: 'Agreed. ' },
];

// Friendly labels for the BR audit log. Keys are the raw column names
// `logBrAudit()` writes into `business_request_audit_logs.field_changed`;
// values are what the UI shows in the History feed. Any field not listed
// falls back to a generic snake_case → Title Case humaniser.
const BR_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  process_step: 'Status',
  urgency: 'Priority',
  request_type: 'Request type',
  category: 'Category',
  theme: 'Theme',
  planned_quarter: 'Planned release',
  end_date: 'Target date',
  project_manager_user_id: 'Delivery Manager',
  po_user_id: 'Product Owner',
  product_id: 'Product',
  stakeholders: 'Stakeholders',
  targeted_feature: 'Targeted feature',
  rank: 'Rank',
  created_by: 'Created by',
};

// Columns whose value is a `profiles.id` UUID — old_value / new_value
// of audit rows for these fields must be resolved against the profiles
// table so the History feed shows the user's name, not the raw UUID.
const BR_USER_ID_FIELDS = new Set<string>([
  'project_manager_user_id',
  'po_user_id',
  'created_by',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanizeField(raw: string): string {
  return (
    BR_FIELD_LABELS[raw] ??
    raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Vocabulary lookups — translate the snake_case / abbreviation
// `new_value` / `old_value` stored in audit rows back into the same
// human label the user sees in the BR sidebar picker.
const THEME_VALUE_TO_LABEL = new Map(
  THEME_OPTIONS.map((t) => [t.value, t.labelEn ?? t.label]),
);
const REQUEST_TYPE_VALUE_TO_LABEL = new Map(
  REQUEST_TYPE_OPTIONS.map((t) => [t.value, t.label]),
);
const STAKEHOLDER_VALUE_TO_LABEL = new Map(
  STAKEHOLDER_OPTIONS.map((s) => [s.value, s.label]),
);

function resolveThemeValue(v: string | null): string | null {
  if (!v) return v;
  return THEME_VALUE_TO_LABEL.get(v) ?? v;
}

function resolveRequestTypeValue(v: string | null): string | null {
  if (!v) return v;
  return REQUEST_TYPE_VALUE_TO_LABEL.get(v) ?? v;
}

// Stakeholders are persisted as an array; logBrAudit stringifies arrays
// with the default `String([...])` which joins items with commas. The
// raw `new_value` therefore looks like "sidf" or "sidf,modon". Split
// on comma, look up each label, rejoin with ", " for display.
function resolveStakeholdersValue(v: string | null): string | null {
  if (!v) return v;
  return v
    .split(',')
    .map((tok) => tok.trim())
    .filter(Boolean)
    .map((tok) => STAKEHOLDER_VALUE_TO_LABEL.get(tok) ?? tok)
    .join(', ');
}

// Boolean columns are stringified by logBrAudit as 'true' / 'false'.
// Render them as Yes / No to match the checkbox affordance in the UI
// and the convention used in Jira's history feed.
const BR_BOOLEAN_FIELDS = new Set<string>(['targeted_feature']);

function resolveBooleanValue(v: string | null): string | null {
  if (v === null || v === undefined || v === '') return v;
  if (v === 'true') return 'Yes';
  if (v === 'false') return 'No';
  return v;
}

function mapComment(raw: any): CdsComment {
  const profile = raw.author;
  return {
    id: raw.id,
    author: {
      id: raw.user_id || 'unknown',
      name: profile?.full_name || profile?.email || 'Unknown',
      avatarUrl:
        resolveAvatarUrl(profile?.full_name) ?? profile?.avatar_url ?? null,
      email: profile?.email,
    },
    content: raw.message || '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isEdited: raw.updated_at && raw.updated_at !== raw.created_at,
    parentId: null,
  };
}

function mapActivity(raw: any): CdsActivityItem {
  const profile = raw.actor;
  const action = (raw.action || '').toLowerCase();
  let type: CdsActivityItem['type'] = 'update';
  if (action === 'created' || action === 'create') type = 'create';
  else if (action === 'deleted' || action === 'delete') type = 'delete';

  const actorName = profile?.full_name || raw.actor_name || 'System';

  return {
    id: raw.id,
    type,
    actor: {
      id: raw.actor_id || 'system',
      name: actorName,
      avatarUrl:
        resolveAvatarUrl(actorName) ?? profile?.avatar_url ?? null,
    },
    timestamp: raw.created_at,
    description: type === 'create' ? 'created this item' : undefined,
    fieldChange: raw.field_changed
      ? {
          field: raw._field_label ?? humanizeField(raw.field_changed),
          oldValue: raw._old_value_resolved ?? raw.old_value,
          newValue: raw._new_value_resolved ?? raw.new_value,
        }
      : undefined,
  };
}

export function BrActivitySection({
  requestId,
  isOpen,
}: BrActivitySectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  const enabled = !!requestId && isOpen;

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-mentions-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const mentionableUsers: CdsUser[] = profiles.map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email || 'Unknown',
    avatarUrl: p.avatar_url,
    email: p.email,
  }));

  useQuery({
    queryKey: ['current-user-profile', user?.id],
    enabled: !!user?.id && profiles.length > 0,
    queryFn: async () => {
      const match = profiles.find((p: any) => p.id === user!.id);
      if (match) {
        setCurrentUser({
          id: match.id,
          name: match.full_name || match.email || 'You',
          avatarUrl: match.avatar_url,
          email: match.email,
        });
      }
      return match;
    },
  });

  // Comments — business_request_discussions keyed on business_request_id.
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['br-discussions', requestId],
    enabled,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('business_request_discussions')
        .select('id, business_request_id, message, user_id, created_at, updated_at')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[BrActivitySection] business_request_discussions select failed', error);
        return [];
      }
      if (!data?.length) return [];
      const authorIds = [
        ...new Set(data.map((c: any) => c.user_id).filter(Boolean)),
      ];
      if (authorIds.length === 0) {
        return data.map((c: any) => ({ ...c, author: null }));
      }
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', authorIds as string[]);
      const profileMap = new Map(
        (authorProfiles ?? []).map((p) => [p.id, p]),
      );
      return data.map((c: any) => ({
        ...c,
        author: c.user_id ? profileMap.get(c.user_id) ?? null : null,
      }));
    },
  });

  // History — business_request_audit_logs keyed on business_request_id.
  // Written by logBrAudit() in src/hooks/useBusinessRequests.ts on every
  // update, with one row per changed field.
  const { data: historyItems = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['br-audit', requestId],
    enabled,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('business_request_audit_logs')
        .select(
          'id, business_request_id, action, actor_id, actor_name, field_changed, old_value, new_value, created_at',
        )
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[BrActivitySection] business_request_audit_logs select failed', error);
        return [];
      }
      if (!data?.length) return [];
      // Collect (a) actor UUIDs and (b) value UUIDs from user-id fields
      // (Delivery Manager, Product Owner, Created by). One batched
      // profiles SELECT resolves all of them in a single round-trip.
      const profileIds = new Set<string>();
      for (const e of data as any[]) {
        if (e.actor_id) profileIds.add(e.actor_id);
        if (e.field_changed && BR_USER_ID_FIELDS.has(e.field_changed)) {
          if (e.old_value && UUID_RE.test(e.old_value)) profileIds.add(e.old_value);
          if (e.new_value && UUID_RE.test(e.new_value)) profileIds.add(e.new_value);
        }
      }
      let profileMap = new Map<string, any>();
      if (profileIds.size > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', [...profileIds]);
        profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));
      }
      const resolveUserValue = (v: string | null): string | null => {
        if (!v) return v;
        if (!UUID_RE.test(v)) return v;
        const p = profileMap.get(v);
        return p?.full_name || p?.email || v;
      };
      return (data as any[]).map((e) => {
        const field = e.field_changed;
        const isUserField = field && BR_USER_ID_FIELDS.has(field);
        const isTheme = field === 'theme';
        const isRequestType = field === 'request_type';
        const isStakeholders = field === 'stakeholders';
        const isBooleanField = field && BR_BOOLEAN_FIELDS.has(field);

        const resolveValue = (v: string | null): string | null => {
          if (isUserField) return resolveUserValue(v);
          if (isTheme) return resolveThemeValue(v);
          if (isRequestType) return resolveRequestTypeValue(v);
          if (isStakeholders) return resolveStakeholdersValue(v);
          if (isBooleanField) return resolveBooleanValue(v);
          return v;
        };

        return {
          ...e,
          actor: e.actor_id ? profileMap.get(e.actor_id) ?? null : null,
          // Friendly label for the History feed (e.g.
          // project_manager_user_id → "Delivery Manager").
          _field_label: field ? humanizeField(field) : null,
          // Translate raw stored values back to picker labels.
          _old_value_resolved: resolveValue(e.old_value),
          _new_value_resolved: resolveValue(e.new_value),
        };
      });
    },
  });

  // Realtime — invalidate the React-Query caches whenever a row
  // for this BR is inserted / updated / deleted on either table.
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`br-activity-realtime:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_request_discussions',
          filter: `business_request_id=eq.${requestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['br-discussions', requestId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_request_audit_logs',
          filter: `business_request_id=eq.${requestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['br-audit', requestId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, requestId, queryClient]);

  const mappedComments: CdsComment[] = comments.map(mapComment);
  const mappedHistory: CdsActivityItem[] = historyItems.map(mapActivity);

  const addMutation = useMutation({
    mutationFn: async ({ body }: { body: string }) => {
      if (!requestId) {
        throw new Error('Business request not resolved yet — try again in a moment.');
      }
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('business_request_discussions')
        .insert({
          business_request_id: requestId,
          message: body,
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-discussions', requestId] });
      catalystToast.success('Comment added');
    },
    onError: () => catalystToast.error('Failed to add comment'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await (supabase as any)
        .from('business_request_discussions')
        .update({ message: body, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-discussions', requestId] });
      catalystToast.success('Comment updated');
    },
    onError: () => catalystToast.error('Failed to update comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Mirror canonical: clean up any markdown-image attachments
      // uploaded into this message body so storage doesn't leak.
      const { data: row } = await (supabase as any)
        .from('business_request_discussions')
        .select('message')
        .eq('id', id)
        .maybeSingle();
      const message = (row as { message?: string } | null)?.message ?? '';
      const paths: string[] = [];
      const re = /!\[[^\]]*\]\(([^)]+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(message)) !== null) {
        const url = m[1];
        const marker = '/storage/v1/object/public/attachments/';
        const idx = url.indexOf(marker);
        if (idx !== -1) paths.push(url.slice(idx + marker.length));
      }
      if (paths.length > 0) {
        await supabase.storage.from('attachments').remove(paths);
      }
      const { error } = await (supabase as any)
        .from('business_request_discussions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-discussions', requestId] });
      catalystToast.success('Comment deleted');
    },
    onError: () => catalystToast.error('Failed to delete comment'),
  });

  const handleAdd = useCallback(
    (content: string) => addMutation.mutateAsync({ body: content }),
    [addMutation],
  );
  const handleEdit = useCallback(
    (id: string, content: string) =>
      editMutation.mutateAsync({ id, body: content }),
    [editMutation],
  );
  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  return (
    <div
      style={{
        borderTop: '1px solid var(--ds-border-subtle, #EBECF0)',
        paddingTop: 20,
        marginTop: 8,
      }}
    >
      <ActivityPanel
        comments={mappedComments}
        historyItems={mappedHistory}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onAddComment={handleAdd}
        onEditComment={handleEdit}
        onDeleteComment={handleDelete}
        isSubmitting={addMutation.isPending}
        isLoadingComments={isLoadingComments}
        isLoadingHistory={isLoadingHistory}
        quickReplies={QUICK_REPLIES}
        defaultTab="all"
        defaultSortOrder="newest"
        hiddenTabs={['worklog']}
      />
    </div>
  );
}

export default BrActivitySection;
