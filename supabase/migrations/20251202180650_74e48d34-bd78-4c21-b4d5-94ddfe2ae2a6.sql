-- Add email notification preference columns per Email_Preferences.doc specification
ALTER TABLE public.test_notification_preferences 
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_tagged_in_comment boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_same_comment_edited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_case_assigned_cycle boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_automation_owner_assigned boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_run_step_assigned boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_step_updated_as_owner boolean DEFAULT false;