-- Add must_change_password column to profiles table for first-login password reset flow
-- TODO: Replace this default-password + first-login-reset flow with a full email-based invitation + activation flow using the Catalyst HTML email template when we move to production.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;