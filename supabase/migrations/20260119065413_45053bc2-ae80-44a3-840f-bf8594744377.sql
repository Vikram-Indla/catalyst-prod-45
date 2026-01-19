-- Add slack_enabled column to user_notification_preferences table
ALTER TABLE public.user_notification_preferences
ADD COLUMN slack_enabled BOOLEAN NOT NULL DEFAULT false;