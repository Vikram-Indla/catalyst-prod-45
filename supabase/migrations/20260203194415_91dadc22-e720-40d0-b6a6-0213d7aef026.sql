-- Fix Security Definer Views for Task¹⁰
-- Set views to use SECURITY INVOKER (respects calling user's RLS policies)

ALTER VIEW t10_list_summary SET (security_invoker = on);
ALTER VIEW t10_items_full SET (security_invoker = on);