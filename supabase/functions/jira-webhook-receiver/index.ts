import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function mapVersionStatus(version: any): string {
  if (version.released) return 'RELEASED';
  if (version.archived) return 'CANCELLED';
  return 'PLANNING';
}

async function isCooldownActive(entityId: string): Promise<boolean> {
  const { data } = await supabase
    .from('sync_cooldowns')
    .select('expires_at')
    .eq('entity_id', entityId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return !!data;
}

async function setCooldown(entityId: string, entityType: string) {
  await supabase.from('sync_cooldowns').upsert({
    entity_id: entityId,
    entity_type: entityType,
    expires_at: new Date(Date.now() + 5000).toISOString(),
  }, { onConflict: 'entity_id,entity_type' });
}

async function handleVersionCreated(payload: any) {
  const v = payload.version;
  if (await isCooldownActive(v.id)) return;

  const { error } = await supabase.from('rh_releases').upsert({
    jira_key: v.id,
    name: v.name,
    description: v.description ?? null,
    target_date: v.releaseDate ?? null,
    status: mapVersionStatus(v),
    source: 'jira',
  }, { onConflict: 'jira_key' });

  if (error) throw error;
  await setCooldown(v.id, 'rh_release');
}

async function handleVersionUpdated(payload: any) {
  const v = payload.version;
  if (await isCooldownActive(v.id)) return;

  const { error } = await supabase
    .from('rh_releases')
    .update({
      name: v.name,
      description: v.description ?? null,
      target_date: v.releaseDate ?? null,
      status: mapVersionStatus(v),
    })
    .eq('jira_key', v.id);

  if (error) throw error;
  await setCooldown(v.id, 'rh_release');
}

async function handleVersionReleased(payload: any) {
  const { error } = await supabase
    .from('rh_releases')
    .update({ status: 'RELEASED' })
    .eq('jira_key', payload.version.id);

  if (error) throw error;
}

async function handleFixVersionsChange(payload: any) {
  const hasFixVersionChange = payload.changelog?.items?.some(
    (i: any) => i.field === 'fixVersions'
  );
  if (!hasFixVersionChange) return false; // signal: not handled

  const issueKey = payload.issue.key;
  const issueId = payload.issue.id;
  const summary = payload.issue.fields.summary;
  const issueType = payload.issue.fields.issuetype?.name ?? null;
  const status = payload.issue.fields.status?.name ?? null;
  const storyPts = payload.issue.fields.story_points ?? null;
  const fixVersionIds: string[] =
    (payload.issue.fields.fixVersions ?? []).map((v: any) => v.id);

  // Find matching rh_releases by jira_key
  const { data: matchedReleases } = await supabase
    .from('rh_releases')
    .select('id, jira_key')
    .in('jira_key', fixVersionIds.length > 0 ? fixVersionIds : ['__none__']);

  const releaseIds = (matchedReleases ?? []).map((r: any) => r.id);

  // Delete memberships no longer in fixVersions
  if (fixVersionIds.length === 0) {
    await supabase
      .from('rh_release_issues')
      .delete()
      .eq('issue_key', issueKey);
  } else if (releaseIds.length > 0) {
    await supabase
      .from('rh_release_issues')
      .delete()
      .eq('issue_key', issueKey)
      .not('release_id', 'in', `(${releaseIds.join(',')})`);
  }

  // Upsert current memberships
  for (const releaseId of releaseIds) {
    await supabase.from('rh_release_issues').upsert({
      release_id: releaseId,
      issue_key: issueKey,
      jira_issue_id: issueId,
      summary,
      issue_type: issueType,
      status,
      story_points: storyPts,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'release_id,issue_key' });
  }

  return true; // signal: handled
}

// ── User events that trigger jira-user-sync ──
const USER_EVENTS = new Set([
  'jira:user_created',
  'jira:user_updated',
  'jira:user_deactivated',
  'jira:user_reactivated',
  'jira:group_member_added',
  'jira:group_member_removed',
  'user_logged_in',
  'jira:user_logged_in',
  'project_member_added',
  'jira:project_created',
  'project_member_removed',
]);

async function handleUserEvent(payload: any, webhookEvent: string) {
  const jiraAccountId = payload.user?.accountId ?? payload.accountId ?? null;

  // Store in jira_webhook_events for audit
  await supabase.from('jira_webhook_events').insert({
    event_type: webhookEvent,
    jira_account_id: jiraAccountId,
    raw_payload: payload,
    hmac_valid: false,
    processed: false,
    received_at: new Date().toISOString(),
  });

  // ── Direct updates based on event type ──
  if (jiraAccountId) {
    // Login events → update last_jira_login_at
    if (webhookEvent === 'user_logged_in' || webhookEvent === 'jira:user_logged_in') {
      await supabase.from('jira_identity_map')
        .update({ last_jira_login_at: new Date().toISOString() })
        .eq('jira_account_id', jiraAccountId);
    }

    // User deactivated in Jira → deactivate in Catalyst immediately
    if (webhookEvent === 'jira:user_deactivated') {
      await supabase.from('jira_identity_map')
        .update({
          is_active_in_jira: false,
          is_active_in_catalyst: false,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('jira_account_id', jiraAccountId);
    }

    // User reactivated in Jira → reactivate in Catalyst immediately
    if (webhookEvent === 'jira:user_reactivated') {
      await supabase.from('jira_identity_map')
        .update({
          is_active_in_jira: true,
          is_active_in_catalyst: true,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('jira_account_id', jiraAccountId);
    }

    // User updated → sync display_name, email, groups
    if (webhookEvent === 'jira:user_updated' || webhookEvent === 'user_updated') {
      const updates: Record<string, any> = { last_synced_at: new Date().toISOString() };
      if (payload.displayName || payload.user?.displayName) updates.display_name = payload.displayName ?? payload.user?.displayName;
      if (payload.emailAddress || payload.user?.emailAddress) updates.email = payload.emailAddress ?? payload.user?.emailAddress;
      if (payload.groups || payload.user?.groups) updates.jira_groups = payload.groups ?? payload.user?.groups;
      await supabase.from('jira_identity_map').update(updates).eq('jira_account_id', jiraAccountId);
    }

    // Project member added → upsert permission
    if (webhookEvent === 'project_member_added' || webhookEvent === 'jira:project_created') {
      const projectKey = payload.projectKey ?? payload.project?.key;
      if (projectKey) {
        const { data: identity } = await supabase.from('jira_identity_map')
          .select('id').eq('jira_account_id', jiraAccountId).maybeSingle();
        if (identity) {
          await supabase.from('jira_user_project_perms').upsert({
            identity_map_id: identity.id,
            project_key: projectKey,
            permission_level: 'view',
            synced_from_jira: true,
          }, { onConflict: 'identity_map_id,project_key' });
        }
      }
    }

    // Project member removed → set permission to none
    if (webhookEvent === 'project_member_removed') {
      const projectKey = payload.projectKey ?? payload.project?.key;
      if (projectKey) {
        const { data: identity } = await supabase.from('jira_identity_map')
          .select('id').eq('jira_account_id', jiraAccountId).maybeSingle();
        if (identity) {
          await supabase.from('jira_user_project_perms')
            .update({ permission_level: 'none', updated_at: new Date().toISOString() })
            .eq('identity_map_id', identity.id)
            .eq('project_key', projectKey);
        }
      }
    }
  }

  // Fire-and-forget user sync for create/update/deactivate events
  const syncEvents = new Set(['jira:user_created', 'jira:user_updated', 'jira:user_deactivated', 'jira:user_reactivated', 'jira:group_member_added', 'jira:group_member_removed']);
  if (jiraAccountId && syncEvents.has(webhookEvent)) {
    fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/jira-user-sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          trigger: 'webhook',
          direction: 'jira_to_catalyst',
          jiraAccountId,
          webhookEventType: webhookEvent,
        }),
      }
    ).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    const webhookEvent = payload.webhookEvent;

    if (!webhookEvent) {
      return new Response('Missing webhookEvent', { status: 400 });
    }
    // ── User events (Jira User Sync) ──
    if (USER_EVENTS.has(webhookEvent)) {
      try {
        await handleUserEvent(payload, webhookEvent);
      } catch (err) {
        console.error('user event handler error:', err);
      }
      return new Response(JSON.stringify({ received: true, event: webhookEvent }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Version events (ReleaseHub) ──
    if (webhookEvent === 'version_created' || webhookEvent === 'jira:version_created') {
      try {
        await handleVersionCreated(payload);
      } catch (err) {
        console.error('version_created error:', err);
      }
      return new Response(JSON.stringify({ received: true, event: webhookEvent }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (webhookEvent === 'version_updated' || webhookEvent === 'jira:version_updated') {
      try {
        await handleVersionUpdated(payload);
      } catch (err) {
        console.error('version_updated error:', err);
      }
      return new Response(JSON.stringify({ received: true, event: webhookEvent }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (webhookEvent === 'version_released' || webhookEvent === 'jira:version_released') {
      try {
        await handleVersionReleased(payload);
      } catch (err) {
        console.error('version_released error:', err);
      }
      return new Response(JSON.stringify({ received: true, event: webhookEvent }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Issue events — check fixVersions change first ──
    if (webhookEvent === 'jira:issue_updated' && payload.issue && payload.changelog) {
      try {
        const handled = await handleFixVersionsChange(payload);
        if (handled) {
          // Also queue into sync_events for existing issue processing
        }
      } catch (err) {
        console.error('fixVersions handler error:', err);
      }
    }

    // ── 2026 GUARDRAIL — skip issues with no 2026 activity (created or updated) ──
    if (payload.issue?.fields) {
      const created = payload.issue.fields.created;
      const updated = payload.issue.fields.updated;
      const createdYear = created ? new Date(created).getFullYear() : null;
      const updatedYear = updated ? new Date(updated).getFullYear() : null;
      const has2026Activity = (createdYear !== null && createdYear >= 2026) ||
                              (updatedYear !== null && updatedYear >= 2026);
      if (!has2026Activity) {
        console.log(`[2026-GUARDRAIL] Webhook skipped pre-2026 issue: ${payload.issue.key} (created ${created}, updated ${updated})`);
        return new Response(
          JSON.stringify({ status: 'skipped_pre_2026', key: payload.issue.key }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── GOVERNANCE LOCK CHECK — skip sync for governance-closed items ──
    if (payload.issue?.key) {
      const { data: isLocked } = await supabase
        .rpc('governance_exclusion_check', { p_item_key: payload.issue.key });

      if (isLocked) {
        await supabase.from('governance_sync_skip_log').insert({
          item_key:     payload.issue.key,
          skip_source:  'webhook',
          jira_payload: payload,
        });
        console.log('[GOVERNANCE] Webhook blocked for locked key:', payload.issue.key);
        return new Response(
          JSON.stringify({ status: 'governance_locked', key: payload.issue.key }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Existing issue/sprint/comment event queuing ──
    let idempotencyKey: string;
    let entityType: string;
    let entityId: string;

    if (payload.issue) {
      entityType = 'issue';
      entityId = payload.issue.id;
      const changelogId = payload.changelog?.id || Date.now().toString();
      idempotencyKey = `jira:issue:${entityId}:${changelogId}`;
    } else if (payload.sprint) {
      entityType = 'sprint';
      entityId = payload.sprint.id?.toString() || 'unknown';
      idempotencyKey = `jira:sprint:${entityId}:${payload.timestamp}`;
    } else if (payload.comment) {
      entityType = 'comment';
      entityId = payload.comment.id;
      idempotencyKey = `jira:comment:${entityId}:${payload.timestamp}`;
    } else if (payload.version) {
      entityType = 'version';
      entityId = payload.version.id?.toString() || 'unknown';
      idempotencyKey = `jira:version:${entityId}:${payload.timestamp || Date.now()}`;
    } else {
      entityType = 'unknown';
      entityId = 'unknown';
      idempotencyKey = `jira:unknown:${payload.timestamp}`;
    }

    const { error } = await supabase.from('sync_events').upsert({
      direction: 'inbound',
      origin_system: 'jira',
      event_type: webhookEvent,
      entity_type: entityType,
      entity_id: entityId,
      idempotency_key: idempotencyKey,
      payload: payload,
      status: 'pending',
    }, { onConflict: 'idempotency_key', ignoreDuplicates: true });

    if (error) {
      console.error('Failed to queue event:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ received: true, event: webhookEvent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
