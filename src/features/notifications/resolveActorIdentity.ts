/**
 * Canonical notification actor identity resolver.
 * Single source of truth for all notification consumers:
 * DirectPanel, WatchingTab, any future notification surface.
 *
 * Resolution priority (first match wins):
 *   1. actor_user_id  → Catalyst UUID profile lookup
 *   2. actor_jira_account_id  → Jira account ID lookup
 *   3. actor_display_name / actor_name  → metadata name (avatar from name lookup)
 *   4. is_jira_sync = true, no actor  → system actor "Jira Sync"
 *   5. nothing  → unknown (caller renders grey placeholder)
 */

export type ActorSource =
  | 'notification_actor_user_id'
  | 'notification_metadata_actor'
  | 'jira_account_mapping'
  | 'system'
  | 'unknown';

export type ActorType = 'user' | 'system' | 'unknown';

export interface CatalystActorIdentity {
  actorType: ActorType;
  displayName: string;
  accountId?: string;
  catalystProfileId?: string;
  avatarUrl?: string | null;
  initials: string;
  source: ActorSource;
}

export interface ActorResolutionMaps {
  byId: Map<string, { name: string; avatarUrl?: string | null }>;
  byJiraId: Map<string, { name: string; avatarUrl?: string | null }>;
  byName: Map<string, { name: string; avatarUrl?: string | null }>;
}

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function resolveActorIdentity(
  actorUserId: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
  maps: ActorResolutionMaps,
  isJiraSync?: boolean,
): CatalystActorIdentity {
  const metaActorName = ((metadata?.actor_display_name ?? metadata?.actor_name) as string | undefined)?.trim() || undefined;
  const metaActorAvatar = (metadata?.actor_avatar_url as string | undefined)?.trim() || undefined;
  const metaActorJiraId = (metadata?.actor_jira_account_id as string | undefined)?.trim() || undefined;

  // Layer 1: Catalyst UUID → approved profile
  if (actorUserId) {
    const p = maps.byId.get(actorUserId);
    if (p) {
      return {
        actorType: 'user',
        displayName: p.name,
        catalystProfileId: actorUserId,
        avatarUrl: p.avatarUrl ?? null,
        initials: buildInitials(p.name),
        source: 'notification_actor_user_id',
      };
    }
  }

  // Layer 2: Jira account ID → approved profile
  if (metaActorJiraId) {
    const p = maps.byJiraId.get(metaActorJiraId);
    if (p) {
      return {
        actorType: 'user',
        displayName: p.name,
        accountId: metaActorJiraId,
        avatarUrl: p.avatarUrl ?? null,
        initials: buildInitials(p.name),
        source: 'jira_account_mapping',
      };
    }
  }

  // Layer 3: metadata actor name (display name from sync / webhook)
  if (metaActorName) {
    const p = maps.byName.get(metaActorName.toLowerCase());
    return {
      actorType: 'user',
      displayName: metaActorName,
      avatarUrl: p?.avatarUrl ?? metaActorAvatar ?? null,
      initials: buildInitials(metaActorName),
      source: 'notification_metadata_actor',
    };
  }

  // Layer 4: Jira sync origin with no actor → system actor
  if (isJiraSync) {
    return {
      actorType: 'system',
      displayName: 'Jira Sync',
      avatarUrl: null,
      initials: 'JS',
      source: 'system',
    };
  }

  // Layer 5: nothing available
  return {
    actorType: 'unknown',
    displayName: 'Unknown',
    avatarUrl: null,
    initials: '?',
    source: 'unknown',
  };
}
