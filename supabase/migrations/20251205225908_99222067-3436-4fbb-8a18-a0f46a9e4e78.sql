-- Update existing business_requests with new process_step values
UPDATE public.business_requests SET process_step = 'new_request' WHERE process_step IN ('request_received', 'new_demand');
UPDATE public.business_requests SET process_step = 'analyse' WHERE process_step IN ('under_study', 'portfolio_review');
UPDATE public.business_requests SET process_step = 'approved' WHERE process_step IN ('demand_approved', 'in_progress', 'awaiting_business_response');
UPDATE public.business_requests SET process_step = 'implement' WHERE process_step IN ('under_implementation', 'implemented');
-- closed and on_hold remain unchanged

-- Also update any audit logs that reference old values
UPDATE public.business_request_audit_logs SET old_value = 'new_request' WHERE field_changed = 'process_step' AND old_value IN ('request_received', 'new_demand');
UPDATE public.business_request_audit_logs SET new_value = 'new_request' WHERE field_changed = 'process_step' AND new_value IN ('request_received', 'new_demand');
UPDATE public.business_request_audit_logs SET old_value = 'analyse' WHERE field_changed = 'process_step' AND old_value IN ('under_study', 'portfolio_review');
UPDATE public.business_request_audit_logs SET new_value = 'analyse' WHERE field_changed = 'process_step' AND new_value IN ('under_study', 'portfolio_review');
UPDATE public.business_request_audit_logs SET old_value = 'approved' WHERE field_changed = 'process_step' AND old_value IN ('demand_approved', 'in_progress', 'awaiting_business_response');
UPDATE public.business_request_audit_logs SET new_value = 'approved' WHERE field_changed = 'process_step' AND new_value IN ('demand_approved', 'in_progress', 'awaiting_business_response');
UPDATE public.business_request_audit_logs SET old_value = 'implement' WHERE field_changed = 'process_step' AND old_value IN ('under_implementation', 'implemented');
UPDATE public.business_request_audit_logs SET new_value = 'implement' WHERE field_changed = 'process_step' AND new_value IN ('under_implementation', 'implemented');