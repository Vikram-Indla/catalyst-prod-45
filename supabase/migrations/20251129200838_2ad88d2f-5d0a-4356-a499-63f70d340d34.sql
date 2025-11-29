-- ============================================
-- JIRA ALIGN NOTIFICATIONS SYSTEM - DATABASE SCHEMA
-- All 3 Phases: Foundation + Workflows + Admin Tools
-- ============================================

-- ============================================
-- PHASE 1: USER PREFERENCES & SUBSCRIPTIONS
-- ============================================

-- User notification preferences (extends profiles)
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  mention_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  subscription_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  workflow_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Work item subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'themes', 'epics', 'capabilities', 'features', 'stories', 'tasks', 'defects',
    'dependencies', 'risks', 'sprints', 'goals', 'success_criteria', 'ideas'
  )),
  entity_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Discussion threads (for @mentions)
CREATE TABLE IF NOT EXISTS public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track @mentions in discussions
CREATE TABLE IF NOT EXISTS public.discussion_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (mentioned_user_id IS NOT NULL OR mentioned_team_id IS NOT NULL)
);

-- ============================================
-- PHASE 2: WORKFLOW AUTOMATION
-- ============================================

-- Workflow rules for automated notifications
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('created', 'updated', 'deleted', 'state_changed')),
  state_value TEXT, -- For state_changed triggers
  program_increment_id UUID REFERENCES public.program_increments(id) ON DELETE SET NULL,
  notify_roles TEXT[], -- Array of role names to notify
  notify_emails TEXT[], -- Array of email addresses (max 50)
  is_active BOOLEAN NOT NULL DEFAULT true,
  architecture_review_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- PHASE 3: ADMIN TOOLS
-- ============================================

-- Admin announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'roles', 'teams')),
  target_roles TEXT[], -- If target_audience = 'roles'
  target_team_ids UUID[], -- If target_audience = 'teams'
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Track dismissed announcements per user
CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Scheduled email configuration
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  send_day INTEGER NOT NULL, -- 1-7 for weekly, 1-31 for monthly
  send_time TIME NOT NULL,
  recipient_filter JSONB, -- Store complex filter criteria
  notify_roles TEXT[],
  notify_emails TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_entity ON public.subscriptions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_discussions_entity ON public.discussions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_discussion_mentions_user ON public.discussion_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_entity_type ON public.workflow_rules(entity_type);
CREATE INDEX IF NOT EXISTS idx_announcements_active_dates ON public.announcements(is_active, start_date, end_date);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- User Notification Preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

-- Discussions
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all discussions"
  ON public.discussions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create discussions"
  ON public.discussions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discussions"
  ON public.discussions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions"
  ON public.discussions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Discussion Mentions
ALTER TABLE public.discussion_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions"
  ON public.discussion_mentions
  FOR SELECT
  USING (true);

CREATE POLICY "System can create mentions"
  ON public.discussion_mentions
  FOR INSERT
  WITH CHECK (true);

-- Workflow Rules
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workflow rules"
  ON public.workflow_rules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view workflow rules"
  ON public.workflow_rules
  FOR SELECT
  USING (true);

-- Announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view active announcements"
  ON public.announcements
  FOR SELECT
  USING (
    is_active = true AND
    now() BETWEEN start_date AND end_date
  );

-- Announcement Dismissals
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dismissals"
  ON public.announcement_dismissals
  FOR ALL
  USING (auth.uid() = user_id);

-- Scheduled Emails
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled emails"
  ON public.scheduled_emails
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-create user preferences on signup
CREATE OR REPLACE FUNCTION public.create_user_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger for new user preferences
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_notification_preferences();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_updated_at();

CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_updated_at();

CREATE TRIGGER update_workflow_rules_updated_at
  BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_updated_at();