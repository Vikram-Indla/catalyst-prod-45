CREATE OR REPLACE VIEW public.notification_unread_counts
WITH (security_invoker = true) AS
SELECT
  recipient_user_id,
  COUNT(*) FILTER (WHERE tab = 'direct')   AS direct_unread,
  COUNT(*) FILTER (WHERE tab = 'watching') AS watching_unread,
  COUNT(*)                                  AS total_unread
FROM public.notifications
WHERE read_at IS NULL
  AND (snoozed_until IS NULL OR snoozed_until < now())
  AND entity_deleted = false
GROUP BY recipient_user_id;