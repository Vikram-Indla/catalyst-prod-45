DO $$
DECLARE
  uid UUID := '5d5fe9ab-9525-4608-bc70-82724ab9c25c';
  actor1 UUID := gen_random_uuid();
  actor2 UUID := gen_random_uuid();
  actor3 UUID := gen_random_uuid();
  actor4 UUID := gen_random_uuid();
  sys_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

INSERT INTO public.notifications
  (recipient_user_id, actor_user_id, notification_type, entity_type,
   entity_id, entity_title, entity_key, entity_icon_type,
   hub_source, status, status_type, tab, metadata, created_at)
VALUES
(uid, actor1, 'assigned_work_item', 'work_item',
 gen_random_uuid(), 'Login failure on mobile — SSO redirect broken',
 'CATA-4466', 'bug', 'ProjectHub', 'In Progress', 'blue', 'direct',
 '{}', NOW() - INTERVAL '8 minutes'),

(uid, actor2, 'mentioned_in_comment', 'work_item',
 gen_random_uuid(), 'Budget approval workflow for Q2 Ministry projects',
 'BAU-5265', 'story', 'ProjectHub', 'Ready for QA', 'blue', 'direct',
 jsonb_build_object(
   'comment_preview', '@Vikram, the approval flow is deployed to staging. Please verify the signature chain and confirm with the Ministry team. cc: @Dr. Ahmed',
   'attachment_filename', 'approval-flow-diagram.png',
   'comment_id', gen_random_uuid()::text
 ), NOW() - INTERVAL '1 hour'),

(uid, actor3, 'status_changed', 'work_item',
 gen_random_uuid(), 'Ministry dashboard performance optimization — Phase 2',
 'CATA-5102', 'task', 'ProjectHub', 'Ready for QA', 'blue', 'direct',
 jsonb_build_object('status_from', 'In Progress', 'status_to', 'Ready for QA'),
 NOW() - INTERVAL '2 hours'),

(uid, sys_id, 'due_date_approaching', 'work_item',
 gen_random_uuid(), 'Login failure on mobile — SSO redirect broken',
 'CATA-4466', 'bug', 'ProjectHub', 'In Progress', 'blue', 'direct',
 jsonb_build_object('due_date', (NOW() + INTERVAL '2 days')::DATE::TEXT),
 NOW() - INTERVAL '3 hours'),

(uid, actor1, 'assigned_story', 'work_item',
 gen_random_uuid(), 'National Industrial Strategy — Quarterly OKR Review',
 'STRG-0312', 'story', 'StrategyHub', 'To Do', 'gray', 'direct',
 '{}', NOW() - INTERVAL '1 day'),

(uid, actor4, 'commented_on_work_item', 'work_item',
 gen_random_uuid(), 'Export PDF fails for reports with 500+ rows',
 'PROD-0089', 'bug', 'ProductHub', 'Backlog', 'gray', 'direct',
 jsonb_build_object(
   'comment_preview', 'Can we prioritize this for the next release? The Ministry reporting team has flagged this as blocking their monthly submissions.'
 ), NOW() - INTERVAL '1 day' - INTERVAL '3 hours'),

(uid, actor2, 'reassigned_work_item', 'work_item',
 gen_random_uuid(), 'Integrate Jira sync for ProjectHub — Phase 2',
 'CATA-3891', 'task', 'ProjectHub', 'In Progress', 'blue', 'direct',
 jsonb_build_object(
   'reassigned_from_name', 'Khalid Al-Mansouri',
   'reassigned_to_name', 'You'
 ), NOW() - INTERVAL '3 days'),

(uid, actor1, 'created_work_item', 'work_item',
 gen_random_uuid(), 'Digital Transformation Roadmap — Ministry Phase 3',
 'CATA-5210', 'story', 'ProjectHub', 'To Do', 'gray', 'watching',
 '{}', NOW() - INTERVAL '45 minutes'),

(uid, actor3, 'updated_work_item', 'work_item',
 gen_random_uuid(), 'Budget utilization dashboard — Q2 FY2026',
 'PROD-0102', 'task', 'ProductHub', 'In Progress', 'blue', 'watching',
 '{}', NOW() - INTERVAL '1 day' - INTERVAL '6 hours');

UPDATE public.notifications
SET read_at = NOW() - INTERVAL '30 minutes'
WHERE recipient_user_id = uid
  AND notification_type IN ('status_changed', 'assigned_story', 'commented_on_work_item', 'reassigned_work_item', 'updated_work_item');

END $$;