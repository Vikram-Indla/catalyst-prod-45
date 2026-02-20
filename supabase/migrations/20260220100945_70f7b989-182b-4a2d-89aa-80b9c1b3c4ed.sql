
-- Fix security definer views by setting them to security invoker
ALTER VIEW ph_ideas_listing SET (security_invoker = on);
ALTER VIEW ph_ideas_board SET (security_invoker = on);
ALTER VIEW ph_ideas_matrix SET (security_invoker = on);
ALTER VIEW ph_ideas_triage SET (security_invoker = on);
