-- Global reason codes for canonical workflow transitions. Additive + idempotent.
-- version_id NULL = global (apply to all versions). Staging only; production untouched.
INSERT INTO public.ph_wf_reason_codes (version_id, transition_type, code, label, requires_free_text, is_active) VALUES
  (NULL,'exception','blocked_dependency','Blocked — dependency',false,true),
  (NULL,'exception','blocked_environment','Blocked — environment',false,true),
  (NULL,'exception','blocked_requirement_gap','Blocked — requirement gap',false,true),
  (NULL,'exception','blocked_resource_unavailable','Blocked — resource unavailable',false,true),
  (NULL,'cancel','canceled_duplicate','Canceled — duplicate',false,true),
  (NULL,'cancel','canceled_no_longer_needed','Canceled — no longer needed',false,true),
  (NULL,'cancel','canceled_scope_changed','Canceled — scope changed',false,true),
  (NULL,'exception','qa_failed_defect_found','QA failed — defect found',false,true),
  (NULL,'exception','qa_failed_acceptance_gap','QA failed — acceptance gap',false,true),
  (NULL,'exception','uat_failed_business_rejection','UAT failed — business rejection',false,true),
  (NULL,'exception','uat_failed_scope_gap','UAT failed — scope gap',false,true),
  (NULL,'reopen','reopened_issue_found','Reopened — issue found',false,true),
  (NULL,'reopen','reopened_incomplete_delivery','Reopened — incomplete delivery',false,true),
  (NULL,'exception','on_hold_business_priority','On hold — business priority',false,true),
  (NULL,'exception','on_hold_dependency','On hold — dependency',false,true),
  (NULL,'exception','on_hold_capacity','On hold — capacity',false,true)
ON CONFLICT (code) WHERE version_id IS NULL DO NOTHING;
