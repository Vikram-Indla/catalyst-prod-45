CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'process-sync-queue',
  '* * * * *',
  $$SELECT process_sync_events(25)$$
);

SELECT cron.schedule(
  'retry-failed-sync',
  '*/5 * * * *',
  $$SELECT retry_failed_sync_events()$$
);

SELECT cron.schedule(
  'clean-old-sync-events',
  '0 3 * * *',
  $$DELETE FROM sync_events WHERE status = 'processed' AND created_at < now() - interval '30 days'$$
);