import { supabase } from '@/integrations/supabase/client';

let hasSeeded = false; // module-level lock — survives re-renders

export async function seedNotificationsForCurrentUser(): Promise<void> {
  if (hasSeeded) return;
  hasSeeded = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { hasSeeded = false; return; }
  const uid = user.id;

  // Delete any existing notifications for this user (cleanup duplicates)
  await supabase
    .from('notifications')
    .delete()
    .eq('recipient_user_id', uid);

  // Use distinct actor UUIDs so names display correctly
  const actorA = '00000000-0000-0000-0000-000000000001';
  const actorB = '00000000-0000-0000-0000-000000000002';
  const actorC = '00000000-0000-0000-0000-000000000003';

  const rows = [
    {
      recipient_user_id: uid,
      actor_user_id: actorA,
      notification_type: 'assigned_work_item',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'API timeout on project load',
      entity_key: 'BUG-214',
      entity_icon_type: 'bug',
      hub_source: 'TestHub',
      status: 'In Progress',
      status_type: 'blue',
      tab: 'direct',
      metadata: {
        actor_display_name: 'Dr. Ahmed Al-Rashid',
        comment_preview: 'Can you review the API timeout? It is blocking the release.',
      },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 8 * 60000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: actorB,
      notification_type: 'mentioned_in_comment',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Dashboard KPI refresh',
      entity_key: 'STORY-88',
      entity_icon_type: 'story',
      hub_source: 'ProjectHub',
      status: 'In Review',
      status_type: 'blue',
      tab: 'direct',
      metadata: {
        actor_display_name: 'Eng. Fatima Al-Harbi',
        comment_preview: 'Can you review the edge case handling for 429 responses? We need exponential backoff.',
        reactions: { '👍': 2, '🔥': 1 },
      },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: actorC,
      notification_type: 'due_date_approaching',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Supplier portal authentication',
      entity_key: 'STORY-45',
      entity_icon_type: 'story',
      hub_source: 'ProjectHub',
      status: 'To Do',
      status_type: 'gray',
      tab: 'direct',
      metadata: {
        actor_display_name: 'Ms. Nora Al-Zahrani',
        due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: actorA,
      notification_type: 'status_changed',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Procurement module integration',
      entity_key: 'TASK-301',
      entity_icon_type: 'task',
      hub_source: 'ProjectHub',
      status: 'Done',
      status_type: 'green',
      tab: 'watching',
      metadata: {
        actor_display_name: 'Mr. Khalid Al-Qahtani',
        status_from: 'In Progress',
        status_to: 'Done',
      },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: actorB,
      notification_type: 'commented_on_work_item',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Phase 2 Industrial Integration',
      entity_key: 'EPIC-12',
      entity_icon_type: 'epic',
      hub_source: 'ProductHub',
      status: 'In Progress',
      status_type: 'blue',
      tab: 'watching',
      metadata: {
        actor_display_name: 'Eng. Fatima Al-Harbi',
        comment_preview: 'The scope creep on Phase 2 needs to be addressed before the next ministry gate.',
      },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: actorC,
      notification_type: 'ai_insight_generated',
      entity_type: 'work_item',
      entity_id: crypto.randomUUID(),
      entity_title: 'Weekly AI Digest — Ministry Portfolio',
      entity_key: 'AI-DIG-01',
      entity_icon_type: 'task',
      hub_source: 'AI',
      status: 'Active',
      status_type: 'blue',
      tab: 'ai',
      metadata: {
        actor_display_name: 'Catalyst AI',
        summary: '3 items at risk this week. Release 3.2 has 4 unresolved blockers. Confidence: 78%.',
      },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
  ];

  await supabase.from('notifications').insert(rows as any);
}
