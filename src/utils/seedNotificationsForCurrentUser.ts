import { supabase } from '@/integrations/supabase/client';

const SEED_VERSION = 'v3';

export async function seedNotificationsForCurrentUser(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const uid = user.id;

  // Check if this version already seeded
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('recipient_user_id', uid)
    .eq('hub_source', `seed_${SEED_VERSION}`)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Delete ALL prior seed/test rows for this user
  await supabase
    .from('notifications')
    .delete()
    .eq('recipient_user_id', uid);

  const now = Date.now();
  const rows = [
    {
      recipient_user_id: uid,
      actor_user_id: null,
      notification_type: 'assigned_work_item',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'API timeout on project load',
      entity_key: 'BUG-214',
      entity_icon_type: 'bug',
      hub_source: `seed_${SEED_VERSION}`,
      status: 'In Progress',
      status_type: 'blue',
      tab: 'direct',
      metadata: { actor_display_name: 'Dr. Ahmed Al-Rashid', comment_preview: 'Can you review the API timeout? It is blocking the release.' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(now - 8 * 60000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: null,
      notification_type: 'mentioned_in_comment',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Dashboard KPI refresh',
      entity_key: 'STORY-88',
      entity_icon_type: 'story',
      hub_source: `seed_${SEED_VERSION}`,
      status: 'In Review',
      status_type: 'blue',
      tab: 'direct',
      metadata: { actor_display_name: 'Eng. Fatima Al-Harbi', comment_preview: 'Can you review the edge case handling for 429 responses? We need exponential backoff.', reactions: { '👍': 2, '🔥': 1 } },
      delivered_at: new Date().toISOString(),
      created_at: new Date(now - 45 * 60000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: null,
      notification_type: 'due_date_approaching',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Supplier portal authentication',
      entity_key: 'STORY-45',
      entity_icon_type: 'story',
      hub_source: `seed_${SEED_VERSION}`,
      status: 'To Do',
      status_type: 'gray',
      tab: 'direct',
      metadata: { actor_display_name: 'Ms. Nora Al-Zahrani', due_date: new Date(now + 2 * 86400000).toISOString().split('T')[0] },
      delivered_at: new Date().toISOString(),
      created_at: new Date(now - 3 * 3600000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: null,
      notification_type: 'status_changed',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Procurement module integration',
      entity_key: 'TASK-301',
      entity_icon_type: 'task',
      hub_source: `seed_${SEED_VERSION}`,
      status: 'Done',
      status_type: 'green',
      tab: 'watching',
      metadata: { actor_display_name: 'Mr. Khalid Al-Qahtani', status_from: 'In Progress', status_to: 'Done' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(now - 26 * 3600000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: null,
      notification_type: 'commented_on_work_item',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Phase 2 Industrial Integration',
      entity_key: 'EPIC-12',
      entity_icon_type: 'epic',
      hub_source: `seed_${SEED_VERSION}`,
      status: 'In Progress',
      status_type: 'blue',
      tab: 'watching',
      metadata: { actor_display_name: 'Eng. Fatima Al-Harbi', comment_preview: 'The scope creep on Phase 2 needs to be addressed before the next ministry gate.' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(now - 2 * 86400000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: null,
      notification_type: 'ai_insight_generated',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Weekly AI Digest — Ministry Portfolio',
      entity_key: 'AI-DIG-01',
      entity_icon_type: 'task',
      hub_source: `seed_${SEED_VERSION}`,
      status: 'Active',
      status_type: 'blue',
      tab: 'ai',
      metadata: { actor_display_name: 'Catalyst AI', summary: '3 items at risk this week. Release 3.2 has 4 unresolved blockers. Confidence: 78%.' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(now - 6 * 3600000).toISOString(),
    },
  ];

  await supabase.from('notifications').insert(rows as any);
}
