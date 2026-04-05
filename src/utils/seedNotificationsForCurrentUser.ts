import { supabase } from '@/integrations/supabase/client';

export async function seedNotificationsForCurrentUser(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const uid = user.id;

  // Check if already seeded — avoid duplicates
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', uid);
  if ((count ?? 0) > 0) return; // already seeded

  const rows = [
    {
      recipient_user_id: uid,
      actor_user_id: uid,
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
      metadata: { comment_preview: 'Can you review the API timeout? It is blocking the release.' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 8 * 60000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: uid,
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
        comment_preview: 'Can you review the edge case handling for 429 responses? We need exponential backoff.',
        reactions: { '👍': 2, '🔥': 1 },
      },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: uid,
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
      metadata: { due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: uid,
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
      metadata: { status_from: 'In Progress', status_to: 'Done' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: uid,
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
      metadata: { comment_preview: 'The scope creep on Phase 2 needs to be addressed before the next ministry gate.' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      recipient_user_id: uid,
      actor_user_id: uid,
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
      metadata: { summary: '3 items at risk this week. Release 3.2 has 4 unresolved blockers. Confidence: 78%.' },
      delivered_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
  ];

  await supabase.from('notifications').insert(rows as any);
}
