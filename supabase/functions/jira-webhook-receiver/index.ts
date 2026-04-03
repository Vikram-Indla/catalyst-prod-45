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
      // Version events already handled above; queue for audit trail
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
