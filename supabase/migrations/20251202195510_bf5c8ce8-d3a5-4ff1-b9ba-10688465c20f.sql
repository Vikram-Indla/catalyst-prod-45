-- ==============================================
-- IDEATION MODULE - DATABASE SCHEMA
-- Version 1.0 | Based on Jira Align Ideation
-- ==============================================

-- 1. Ideation Forms (must be created before idea_groups due to FK)
CREATE TABLE public.ideation_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ideation_forms ENABLE ROW LEVEL SECURITY;

-- 2. Ideation Form Fields
CREATE TABLE public.ideation_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.ideation_forms(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('textbox', 'opentext', 'dropdown')),
  options JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_external BOOLEAN NOT NULL DEFAULT false,
  help_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ideation_form_fields ENABLE ROW LEVEL SECURITY;

-- 3. Idea Groups (Campaigns)
CREATE TABLE public.idea_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Enhancement' CHECK (category IN ('Enhancement', 'Question', 'Ticket')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false,
  make_states_public BOOLEAN NOT NULL DEFAULT false,
  allow_voting BOOLEAN NOT NULL DEFAULT true,
  voting_type VARCHAR(20) NOT NULL DEFAULT 'ForAgainst' CHECK (voting_type IN ('ForAgainst', 'Token')),
  max_votes_per_idea INTEGER,
  total_user_tokens INTEGER NOT NULL DEFAULT 10,
  approve_external_users BOOLEAN NOT NULL DEFAULT false,
  external_link VARCHAR(500) UNIQUE,
  form_id UUID REFERENCES public.ideation_forms(id) ON DELETE SET NULL,
  product_id UUID,
  admin_user_ids UUID[] DEFAULT '{}',
  contributor_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.idea_groups ENABLE ROW LEVEL SECURITY;

-- 4. Ideas
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_group_id UUID NOT NULL REFERENCES public.idea_groups(id) ON DELETE CASCADE,
  title VARCHAR(1000) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Open', 'Planned', 'Completed', 'Shelved')),
  t_shirt_size VARCHAR(10) CHECK (t_shirt_size IN ('XS', 'S', 'M', 'L', 'XL')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL,
  created_by_id UUID NOT NULL,
  product_id UUID,
  customer_id UUID,
  work_item_id UUID,
  work_item_type VARCHAR(20) CHECK (work_item_type IN ('Epic', 'Feature', 'Story')),
  vote_score INTEGER NOT NULL DEFAULT 0,
  for_votes INTEGER NOT NULL DEFAULT 0,
  against_votes INTEGER NOT NULL DEFAULT 0,
  token_votes INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_ideas_idea_group_id ON public.ideas(idea_group_id);
CREATE INDEX idx_ideas_status ON public.ideas(status);
CREATE INDEX idx_ideas_vote_score ON public.ideas(vote_score DESC);

-- 5. Ideation Votes
CREATE TABLE public.ideation_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('For', 'Against', 'Token')),
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

-- Enable RLS
ALTER TABLE public.ideation_votes ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX idx_ideation_votes_idea_id ON public.ideation_votes(idea_id);
CREATE INDEX idx_ideation_votes_user_id ON public.ideation_votes(user_id);

-- 6. Ideation Comments
CREATE TABLE public.ideation_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_external BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ideation_comments ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX idx_ideation_comments_idea_id ON public.ideation_comments(idea_id);

-- 7. Ideation Attachments
CREATE TABLE public.ideation_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by_id UUID NOT NULL,
  is_external BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ideation_attachments ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX idx_ideation_attachments_idea_id ON public.ideation_attachments(idea_id);

-- 8. Ideation Subscriptions
CREATE TABLE public.ideation_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_external BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

-- Enable RLS
ALTER TABLE public.ideation_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX idx_ideation_subscriptions_idea_id ON public.ideation_subscriptions(idea_id);

-- 9. Ideation External Users
CREATE TABLE public.ideation_external_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  registered_group_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ideation_external_users ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Ideation Forms Policies
CREATE POLICY "Authenticated users can view ideation forms"
  ON public.ideation_forms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage ideation forms"
  ON public.ideation_forms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Form Fields Policies
CREATE POLICY "Authenticated users can view form fields"
  ON public.ideation_form_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage form fields"
  ON public.ideation_form_fields FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Idea Groups Policies
CREATE POLICY "Authenticated users can view idea groups"
  ON public.idea_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage idea groups"
  ON public.idea_groups FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = ANY(admin_user_ids));

-- Ideas Policies
CREATE POLICY "Authenticated users can view ideas"
  ON public.ideas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create ideas"
  ON public.ideas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "Users can update their own ideas or admins"
  ON public.ideas FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = created_by_id OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins and owners can delete ideas"
  ON public.ideas FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by_id OR
    public.has_role(auth.uid(), 'admin')
  );

-- Votes Policies
CREATE POLICY "Authenticated users can view votes"
  ON public.ideation_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own votes"
  ON public.ideation_votes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments Policies
CREATE POLICY "Authenticated users can view comments"
  ON public.ideation_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.ideation_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.ideation_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.ideation_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Attachments Policies
CREATE POLICY "Authenticated users can view attachments"
  ON public.ideation_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add attachments"
  ON public.ideation_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by_id);

CREATE POLICY "Users can delete their own attachments"
  ON public.ideation_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by_id OR public.has_role(auth.uid(), 'admin'));

-- Subscriptions Policies
CREATE POLICY "Users can view subscriptions"
  ON public.ideation_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own subscriptions"
  ON public.ideation_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- External Users Policies (admin only)
CREATE POLICY "Admins can view external users"
  ON public.ideation_external_users FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage external users"
  ON public.ideation_external_users FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ==============================================
-- TRIGGERS for updated_at
-- ==============================================

CREATE TRIGGER update_ideation_forms_updated_at
  BEFORE UPDATE ON public.ideation_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ideation_form_fields_updated_at
  BEFORE UPDATE ON public.ideation_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_idea_groups_updated_at
  BEFORE UPDATE ON public.idea_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ideation_comments_updated_at
  BEFORE UPDATE ON public.ideation_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- FUNCTION: Update vote counts on idea
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_idea_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.ideas
    SET 
      for_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = NEW.idea_id AND vote_type = 'For'),
      against_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = NEW.idea_id AND vote_type = 'Against'),
      token_votes = (SELECT COALESCE(SUM(token_count), 0) FROM public.ideation_votes WHERE idea_id = NEW.idea_id AND vote_type = 'Token'),
      vote_score = (
        SELECT COALESCE(SUM(CASE 
          WHEN vote_type = 'For' THEN 1 
          WHEN vote_type = 'Against' THEN -1 
          WHEN vote_type = 'Token' THEN token_count 
          ELSE 0 
        END), 0)
        FROM public.ideation_votes WHERE idea_id = NEW.idea_id
      )
    WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas
    SET 
      for_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = OLD.idea_id AND vote_type = 'For'),
      against_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = OLD.idea_id AND vote_type = 'Against'),
      token_votes = (SELECT COALESCE(SUM(token_count), 0) FROM public.ideation_votes WHERE idea_id = OLD.idea_id AND vote_type = 'Token'),
      vote_score = (
        SELECT COALESCE(SUM(CASE 
          WHEN vote_type = 'For' THEN 1 
          WHEN vote_type = 'Against' THEN -1 
          WHEN vote_type = 'Token' THEN token_count 
          ELSE 0 
        END), 0)
        FROM public.ideation_votes WHERE idea_id = OLD.idea_id
      )
    WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_idea_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.ideation_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_idea_vote_counts();

-- ==============================================
-- FUNCTION: Update comment count on idea
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_idea_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ideas SET comment_count = comment_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_idea_comment_count
  AFTER INSERT OR DELETE ON public.ideation_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_idea_comment_count();

-- ==============================================
-- FUNCTION: Update attachment count on idea
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_idea_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ideas SET attachment_count = attachment_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas SET attachment_count = GREATEST(0, attachment_count - 1) WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_idea_attachment_count
  AFTER INSERT OR DELETE ON public.ideation_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_idea_attachment_count();

-- ==============================================
-- SEED DATA: Default form and sample idea group
-- ==============================================

-- Insert default form
INSERT INTO public.ideation_forms (id, name, description)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Default Ideation Form', 'Standard form for idea submission');

-- Insert default form fields
INSERT INTO public.ideation_form_fields (form_id, label, field_type, is_active, is_required, is_external, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Title', 'textbox', true, true, true, 1),
  ('00000000-0000-0000-0000-000000000001', 'Description', 'opentext', true, true, true, 2),
  ('00000000-0000-0000-0000-000000000001', 'Category', 'dropdown', true, false, true, 3),
  ('00000000-0000-0000-0000-000000000001', 'Priority', 'dropdown', true, false, false, 4);

-- Update dropdown options
UPDATE public.ideation_form_fields 
SET options = '["Bug Fix", "Feature Request", "Improvement", "Other"]'::jsonb
WHERE label = 'Category' AND form_id = '00000000-0000-0000-0000-000000000001';

UPDATE public.ideation_form_fields 
SET options = '["Low", "Medium", "High", "Critical"]'::jsonb
WHERE label = 'Priority' AND form_id = '00000000-0000-0000-0000-000000000001';

-- Insert sample idea groups
INSERT INTO public.idea_groups (id, name, category, is_enabled, is_public, voting_type, form_id)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'Product Enhancement Requests', 'Enhancement', true, true, 'ForAgainst', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Innovation Challenge Q1 2025', 'Enhancement', true, false, 'Token', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'Customer Feedback Portal', 'Question', true, true, 'ForAgainst', '00000000-0000-0000-0000-000000000001');