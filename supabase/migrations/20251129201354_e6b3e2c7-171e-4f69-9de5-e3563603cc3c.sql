-- Add granular notification preference fields and announcement type

-- Extend user_notification_preferences with granular fields
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
  ADD COLUMN IF NOT EXISTS notify_work_item_assigned BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_work_item_state_change BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_mentions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_subscriptions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_dependencies BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_objectives BOOLEAN NOT NULL DEFAULT true;

-- Add type field to announcements
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical'));