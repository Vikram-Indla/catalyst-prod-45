# Catalyst Database Schema Dump

**Generated:** 2026-01-19  
**Total Tables:** 518  
**Schema:** public

---

## Table of Contents

1. [Acceptance Criteria & Stories](#acceptance-criteria--stories)
2. [AI & Governance](#ai--governance)
3. [Announcements](#announcements)
4. [API & Authentication](#api--authentication)
5. [Assignments & Capacity](#assignments--capacity)
6. [Attachments & Comments](#attachments--comments)
7. [Board Configs](#board-configs)
8. [Business Lines & Owners](#business-lines--owners)
9. [Business Requests](#business-requests)
10. [CAP Committee](#cap-committee)
11. [Certifications](#certifications)
12. [Change Management](#change-management)
13. [Custom Fields](#custom-fields)
14. [Defects](#defects)
15. [Demand Management](#demand-management)
16. [Dependencies](#dependencies)
17. [Discussions](#discussions)
18. [Epics](#epics)
19. [Features](#features)
20. [Goals & Objectives](#goals--objectives)
21. [Ideas & Ideation](#ideas--ideation)
22. [Incidents](#incidents)
23. [Initiatives](#initiatives)
24. [Notifications](#notifications)
25. [Planner & Tasks](#planner--tasks)
26. [Products](#products)
27. [Profiles & Users](#profiles--users)
28. [Programs & Projects](#programs--projects)
29. [Releases](#releases)
30. [Risks](#risks)
31. [Skills & Team Members](#skills--team-members)
32. [SLA Management](#sla-management)
33. [Slack Integration](#slack-integration)
34. [Sprints](#sprints)
35. [Stories](#stories)
36. [Strategic Themes](#strategic-themes)
37. [Test Management](#test-management)
38. [Vendors](#vendors)
39. [Views & Dashboards](#views--dashboards)
40. [Work Items & Workflows](#work-items--workflows)

---

## Acceptance Criteria & Stories

### acceptance_criteria
```sql
CREATE TABLE public.acceptance_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  content text NOT NULL,
  is_met boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## AI & Governance

### ai_contracts
```sql
CREATE TABLE public.ai_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### ai_feedback
```sql
CREATE TABLE public.ai_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  chosen_mapping jsonb,
  corrected_mapping jsonb,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now()
);
```

### ai_governance_audit_log
```sql
CREATE TABLE public.ai_governance_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  contract_id uuid,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  diff jsonb,
  created_at timestamp with time zone DEFAULT now()
);
```

### ai_integration_settings
```sql
CREATE TABLE public.ai_integration_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mock'::text,
  api_key_encrypted text,
  model text,
  endpoint_url text,
  is_active boolean DEFAULT false,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);
```

### ai_policies
```sql
CREATE TABLE public.ai_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  policy_key text NOT NULL,
  policy_value jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### ai_route_scopes
```sql
CREATE TABLE public.ai_route_scopes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  route text NOT NULL,
  allowed_intents text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### ai_semantic_dictionary
```sql
CREATE TABLE public.ai_semantic_dictionary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  canonical_concept text NOT NULL,
  ui_label text NOT NULL,
  synonyms text[] DEFAULT '{}'::text[],
  resolution jsonb DEFAULT '[]'::jsonb,
  threshold double precision DEFAULT 0.78,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### ai_table_allowlist
```sql
CREATE TABLE public.ai_table_allowlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  table_name text NOT NULL,
  allowed_columns text[] DEFAULT '{}'::text[],
  join_keys jsonb DEFAULT '{}'::jsonb,
  pii_level text DEFAULT 'none'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## Activity & Audit Logs

### activity_logs
```sql
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  actor_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before_json jsonb,
  after_json jsonb,
  created_at timestamp with time zone DEFAULT now()
);
```

### auth_audit_log
```sql
CREATE TABLE public.auth_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  event_type text NOT NULL,
  event_details jsonb,
  ip_address text,
  user_agent text,
  actor_id uuid,
  created_at timestamp with time zone DEFAULT now()
);
```

---

## Announcements

### announcements
```sql
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  target_audience text NOT NULL DEFAULT 'all'::text,
  target_roles text[],
  target_team_ids uuid[],
  is_dismissible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  type text NOT NULL DEFAULT 'info'::text
);
```

### announcement_dismissals
```sql
CREATE TABLE public.announcement_dismissals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dismissed_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## API & Authentication

### api_keys
```sql
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name character varying NOT NULL,
  key_prefix character varying NOT NULL,
  key_hash character varying NOT NULL,
  scopes text[] DEFAULT ARRAY['read'::text],
  is_active boolean DEFAULT true,
  last_used_at timestamp with time zone,
  usage_count integer DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);
```

### auth_settings
```sql
CREATE TABLE public.auth_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## Assignments & Capacity

### assignments
```sql
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  epic_id uuid,
  feature_id uuid,
  story_id uuid,
  allocation_percentage integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active'::text,
  work_item_type text NOT NULL DEFAULT 'project'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);
```

### capacity_departments
```sql
CREATE TABLE public.capacity_departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#0d9488'::text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### capacity_scenarios
```sql
CREATE TABLE public.capacity_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'::text,
  time_scope text NOT NULL DEFAULT 'quarter'::text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  baseline_snapshot jsonb,
  modifications jsonb,
  metrics jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone
);
```

---

## Attachments & Comments

### attachments
```sql
CREATE TABLE public.attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### comments
```sql
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### comment_mentions
```sql
CREATE TABLE public.comment_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL,
  notification_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
```

---

## Board Configs

### board_configs
```sql
CREATE TABLE public.board_configs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  scope_type board_scope_type NOT NULL,
  scope_id uuid,
  board_type board_type NOT NULL,
  columns_json jsonb NOT NULL,
  swimlane_rule jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## Business Lines & Owners

### business_lines
```sql
CREATE TABLE public.business_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### business_owners
```sql
CREATE TABLE public.business_owners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### business_processes
```sql
CREATE TABLE public.business_processes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Business Requests

### business_requests
```sql
CREATE TABLE public.business_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  platform text,
  complexity text,
  urgency text,
  track text,
  requestor text,
  business_justification text,
  start_date date,
  end_date date,
  process_step text DEFAULT 'new_demand'::text,
  health text DEFAULT 'green'::text,
  dependencies text,
  risk_rating text,
  portfolio_comments text,
  delivery_platform text,
  delivery_track text,
  proposed_solution text,
  estimated_effort text,
  estimated_cost numeric,
  integration_required boolean DEFAULT false,
  integration_systems text[],
  technical_validator text,
  estimation_notes text,
  estimation_dependencies text,
  estimation_risk_rating text,
  estimated_cost_sar numeric,
  approval_inputs text,
  portfolio_decision text,
  approver_name text,
  approval_date date,
  approval_decision text,
  approved_budget_ceiling numeric,
  approval_remarks text,
  functional_spec_link text,
  acceptance_criteria text,
  jira_epic_link text,
  environment_dependency text,
  readiness_checklist jsonb DEFAULT '{"environment_ready": false, "resources_allocated": false, "test_cases_prepared": false, "requirements_documented": false, "technical_design_approved": false}'::jsonb,
  implementation_owner text,
  impl_start_date date,
  impl_target_end_date date,
  key_risks_remarks text,
  outcome_summary text,
  qa_remarks text,
  support_owner text,
  support_remarks text,
  resolution_category text,
  implementation_outcome text,
  on_hold_reason text,
  expected_resume_date date,
  on_hold_comment text,
  request_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  rank integer,
  rank_override_justification text,
  business_score integer DEFAULT 0,
  business_value integer DEFAULT 0,
  is_force_ranked boolean DEFAULT false,
  force_ranked_by text,
  force_ranked_at timestamp with time zone,
  deleted_at timestamp with time zone,
  department text,
  business_owner text,
  assignee text,
  funding_status text DEFAULT 'Not Budgeted'::text,
  budget_year text,
  budget_type text[],
  approved_budget_sar numeric,
  current_year_budget_sar numeric,
  budget_owner_name text,
  project_manager_user_id uuid,
  planned_external_spend_sar numeric,
  internal_effort_cost_sar numeric,
  contract_type text,
  primary_vendor_name text,
  po_numbers text[],
  contract_start_date date,
  contract_end_date date,
  delivery_model text,
  capacity_status text DEFAULT 'Not Assessed'::text,
  internal_effort_pct integer DEFAULT 0,
  vendor_effort_pct integer DEFAULT 0,
  funding_assumptions text,
  capacity_risks text,
  department_id uuid,
  business_owner_id uuid,
  score_strategic_alignment integer,
  score_time_urgency integer,
  score_resource_feasibility integer,
  priority_tier text,
  planned_quarter text[],
  product_id uuid,
  progress integer DEFAULT 0,
  ea_review_required boolean DEFAULT false,
  end_date_locked boolean DEFAULT false,
  end_date_locked_by uuid,
  end_date_locked_at timestamp with time zone
);
```

### business_request_audit_logs
```sql
CREATE TABLE public.business_request_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_request_id uuid NOT NULL,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### business_request_discussions
```sql
CREATE TABLE public.business_request_discussions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### business_request_links
```sql
CREATE TABLE public.business_request_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_request_id uuid NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  link_type text NOT NULL DEFAULT 'documentation'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  kind text DEFAULT 'external'::text,
  file_name text,
  file_path text,
  file_size bigint,
  mime_type text,
  uploaded_by uuid,
  linked_item_id uuid,
  linked_item_type text,
  linked_item_source text,
  added_by_name text
);
```

---

## CAP Committee

### cap_committee_default_members
```sql
CREATE TABLE public.cap_committee_default_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text,
  has_veto boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### cap_committee_policy
```sql
CREATE TABLE public.cap_committee_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  approval_mode text NOT NULL DEFAULT 'majority'::text,
  veto_enabled boolean NOT NULL DEFAULT true,
  justification_required boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);
```

---

## Change Management

### change_cards
```sql
CREATE TABLE public.change_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  change_number text NOT NULL,
  title text NOT NULL,
  description text,
  planned_prod_date date NOT NULL,
  release_version_id uuid,
  change_manager_user_id uuid NOT NULL,
  status change_card_status NOT NULL DEFAULT 'new_awaiting_approval'::change_card_status,
  approved boolean NOT NULL DEFAULT false,
  approved_by_user_id uuid,
  approved_at timestamp with time zone,
  compliance_state compliance_state NOT NULL DEFAULT 'compliant'::compliance_state,
  exception_reason_code exception_reason_code,
  exception_notes text,
  exception_recorded_by_user_id uuid,
  exception_recorded_at timestamp with time zone,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by_user_id uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  risk_level text DEFAULT 'low'::text,
  approvals_overall_status text DEFAULT 'pending'::text,
  release_readiness text DEFAULT 'not_ready'::text
);
```

### change_approvals
```sql
CREATE TABLE public.change_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  change_card_id uuid NOT NULL,
  step_type text NOT NULL,
  step_order integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'::text,
  assigned_role text,
  assigned_user_id uuid,
  decision_by_user_id uuid,
  decided_at timestamp with time zone,
  comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### change_card_audit_events
```sql
CREATE TABLE public.change_card_audit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  change_card_id uuid NOT NULL,
  event_type change_audit_event_type NOT NULL,
  from_value text,
  to_value text,
  reason_code exception_reason_code,
  notes text,
  actor_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata_json jsonb DEFAULT '{}'::jsonb
);
```

### change_card_links
```sql
CREATE TABLE public.change_card_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  change_card_id uuid NOT NULL,
  work_item_type change_work_item_type NOT NULL,
  work_item_id text NOT NULL,
  work_item_key text,
  committee_status change_committee_status NOT NULL DEFAULT 'pending'::change_committee_status,
  cached_title text,
  cached_status text,
  cached_priority_or_severity text,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### change_conflicts
```sql
CREATE TABLE public.change_conflicts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  change_card_id uuid NOT NULL,
  conflict_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning'::text,
  related_change_id uuid,
  related_window_id uuid,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  resolved_by_user_id uuid,
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### change_dependencies
```sql
CREATE TABLE public.change_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocking_change_id uuid NOT NULL,
  blocked_change_id uuid NOT NULL,
  dependency_type text NOT NULL DEFAULT 'blocks'::text,
  status text NOT NULL DEFAULT 'active'::text,
  notes text,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### change_numbers
```sql
CREATE TABLE public.change_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  number text NOT NULL,
  description text,
  release_id uuid,
  status text DEFAULT 'draft'::text,
  scheduled_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);
```

---

## Defects

### defects
```sql
CREATE TABLE public.defects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  defect_id text NOT NULL,
  title text NOT NULL,
  description text,
  steps_to_reproduce jsonb,
  preconditions text,
  expected_result text NOT NULL,
  actual_result text NOT NULL,
  severity text NOT NULL,
  priority text NOT NULL,
  workflow_status text NOT NULL DEFAULT 'new'::text,
  environment text,
  environment_details jsonb,
  project_id uuid,
  reporter_id uuid,
  assignee_id uuid,
  linked_story_id uuid,
  linked_feature_id uuid,
  duplicate_of_id uuid,
  root_cause text,
  resolution text,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  target_release_id uuid,
  due_date date,
  tags text[],
  sla_target_hours integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  defect_key character varying,
  test_case_id uuid,
  test_run_id uuid,
  step_number integer,
  external_id character varying,
  external_url text,
  reported_by uuid,
  status character varying DEFAULT 'open'::character varying
);
```

### defect_attachments
```sql
CREATE TABLE public.defect_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  defect_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
```

### defect_comments
```sql
CREATE TABLE public.defect_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  defect_id uuid NOT NULL,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  author_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### defect_audit_log
```sql
CREATE TABLE public.defect_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  defect_id uuid NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  actor_id uuid,
  acted_at timestamp with time zone DEFAULT now()
);
```

---

## Demand Management

### demand_process_steps
```sql
CREATE TABLE public.demand_process_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  color text DEFAULT 'brand-olive'::text
);
```

### demand_field_configs
```sql
CREATE TABLE public.demand_field_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_line_id uuid,
  field_key text NOT NULL,
  label text NOT NULL,
  tab_key text NOT NULL,
  section_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  rules_json jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### departments
```sql
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Dependencies

### dependencies
```sql
CREATE TABLE public.dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_team_id uuid,
  to_team_id uuid,
  from_feature_id uuid,
  to_feature_id uuid,
  dependency_type text NOT NULL DEFAULT 'finish-to-start'::text,
  dependency_level text DEFAULT 'feature'::text,
  status text NOT NULL DEFAULT 'open'::text,
  risk_level text DEFAULT 'medium'::text,
  description text,
  due_date date,
  resolved_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  assigned_to uuid,
  notes text,
  planned_quarter text[],
  committed_date date,
  committed_by uuid,
  committed_at timestamp with time zone
);
```

### dependency_audit_log
```sql
CREATE TABLE public.dependency_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dependency_id uuid NOT NULL,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  actor_id uuid,
  actor_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### dependency_negotiations
```sql
CREATE TABLE public.dependency_negotiations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dependency_id uuid NOT NULL,
  requested_by uuid,
  requested_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending'::text,
  notes text,
  proposed_date date,
  responded_by uuid,
  responded_at timestamp with time zone,
  response_notes text
);
```

---

## Epics

### epics
```sql
CREATE TABLE public.epics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  program_id uuid,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'New'::text,
  priority text DEFAULT 'Medium'::text,
  start_date date,
  target_date date,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  quarter text,
  story_points_total integer DEFAULT 0,
  story_points_done integer DEFAULT 0,
  epic_key text,
  theme_id uuid,
  mvp boolean DEFAULT false,
  business_request_id uuid,
  reporter_id uuid,
  assignee_id uuid,
  complexity text,
  delivery_track text,
  delivery_platform text,
  initiative_id uuid,
  business_alignment integer DEFAULT 0,
  time_criticality integer DEFAULT 0,
  investor_enablement integer DEFAULT 0,
  job_size integer DEFAULT 1,
  rank integer,
  target_complete_locked boolean DEFAULT false,
  target_complete_locked_by uuid,
  target_complete_locked_at timestamp with time zone,
  planned_quarter text[]
);
```

### epic_statuses
```sql
CREATE TABLE public.epic_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  color text DEFAULT 'gray'::text
);
```

### epic_key_sequences
```sql
CREATE TABLE public.epic_key_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prefix text NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## Features

### features
```sql
CREATE TABLE public.features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  epic_id uuid,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'New'::text,
  priority text DEFAULT 'Medium'::text,
  story_points integer DEFAULT 0,
  feature_key text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  owner_id uuid,
  theme_id uuid,
  start_date date,
  end_date date,
  release_id uuid,
  progress integer DEFAULT 0,
  program_increment_id uuid,
  project_id uuid,
  assignee_id uuid,
  reporter_id uuid,
  labels text[],
  component text,
  acceptance_criteria text,
  technical_notes text,
  dependencies text[],
  target_sprint_id uuid,
  rank integer,
  wsjf_score numeric,
  committed_sprint text,
  mvp boolean DEFAULT false,
  planned_quarter text[]
);
```

### feature_statuses
```sql
CREATE TABLE public.feature_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  color text DEFAULT 'gray'::text
);
```

---

## Incidents

### incidents
```sql
CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_key text,
  title text NOT NULL,
  description text,
  status incident_status NOT NULL DEFAULT 'open'::incident_status,
  severity severity_level NOT NULL,
  support_level support_level,
  priority priority_level,
  impact impact_level DEFAULT 'medium'::impact_level,
  urgency urgency_level DEFAULT 'medium'::urgency_level,
  is_major_incident boolean DEFAULT false,
  release_version_id uuid,
  delivery_stage delivery_stage,
  reporter_id uuid,
  reporter_name text,
  assignee_id uuid,
  assignee_workgroup_id uuid,
  target_date date,
  resolved_at timestamp with time zone,
  requires_committee boolean DEFAULT false,
  committee_id uuid,
  converted_to_type text,
  converted_to_id uuid,
  converted_at timestamp with time zone,
  conversion_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamp with time zone,
  business_process_id uuid,
  service_component text,
  incident_type text,
  resolution_summary text,
  resolution_type text,
  root_cause text,
  closed_at timestamp with time zone,
  project_id uuid,
  team_id uuid,
  owning_team_id uuid,
  converted_to_key text,
  converted_by uuid,
  committee_set_at timestamp with time zone,
  committee_set_by uuid
);
```

### incident_committees
```sql
CREATE TABLE public.incident_committees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  status committee_status NOT NULL DEFAULT 'pending'::committee_status,
  decision_summary text,
  decided_at timestamp with time zone,
  decided_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### incident_comments
```sql
CREATE TABLE public.incident_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### incident_attachments
```sql
CREATE TABLE public.incident_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Notifications

### notifications
```sql
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info'::text,
  entity_type text,
  entity_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### notification_preferences
```sql
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  email_enabled boolean DEFAULT true,
  email_digest character varying DEFAULT 'instant'::character varying,
  in_app_enabled boolean DEFAULT true,
  slack_enabled boolean DEFAULT false,
  slack_dm boolean DEFAULT false,
  preferences jsonb DEFAULT '{"mentioned": true, ...}'::jsonb,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
  quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### user_notifications
```sql
CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  entity_type text,
  entity_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  source_user_id uuid,
  priority text DEFAULT 'normal'::text
);
```

---

## Planner & Tasks

### planner_tasks
```sql
CREATE TABLE public.planner_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  title text NOT NULL,
  description text,
  status_id uuid,
  priority text DEFAULT 'medium'::text,
  assignee_id uuid,
  due_date date,
  start_date date,
  progress integer DEFAULT 0,
  estimated_hours numeric,
  actual_hours numeric,
  workstream_id uuid,
  parent_task_id uuid,
  work_item_type text,
  work_item_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  blocked boolean DEFAULT false,
  blocked_reason text,
  cover_url text,
  sort_order integer DEFAULT 0
);
```

### planner_workstreams
```sql
CREATE TABLE public.planner_workstreams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1'::text,
  team_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  slug text
);
```

### planner_statuses
```sql
CREATE TABLE public.planner_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#6B7280'::text,
  category text DEFAULT 'todo'::text,
  sort_order integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## Profiles & Users

### profiles
```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  role text DEFAULT 'user'::text,
  approval_status text DEFAULT 'pending'::text,
  employee_id text,
  department_id uuid,
  job_title text,
  team_id uuid,
  preferences jsonb DEFAULT '{}'::jsonb,
  notification_settings jsonb DEFAULT '{}'::jsonb,
  last_login_at timestamp with time zone,
  is_active boolean DEFAULT true,
  business_line_id uuid
);
```

### user_roles
```sql
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### product_roles
```sql
CREATE TABLE public.product_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Programs & Projects

### programs
```sql
CREATE TABLE public.programs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active'::text,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  program_manager_id uuid
);
```

### projects
```sql
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  program_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  product_owner_id uuid
);
```

---

## Releases

### releases
```sql
CREATE TABLE public.releases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text,
  description text,
  status text NOT NULL DEFAULT 'planned'::text,
  start_date date,
  release_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid,
  notes text
);
```

### release_versions
```sql
CREATE TABLE public.release_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version_number text,
  status text DEFAULT 'draft'::text,
  release_date date,
  description text,
  project_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);
```

---

## Risks

### risks
```sql
CREATE TABLE public.risks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'open'::text,
  roam_status text DEFAULT 'resolved'::text,
  probability integer DEFAULT 3,
  impact integer DEFAULT 3,
  risk_score integer,
  owner_id uuid,
  mitigation_plan text,
  contingency_plan text,
  target_resolution_date date,
  actual_resolution_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  epic_id uuid,
  feature_id uuid,
  story_id uuid,
  theme_id uuid,
  objective_id uuid,
  business_request_id uuid,
  occurrence integer DEFAULT 3,
  detectability integer DEFAULT 3,
  relationship text,
  consequence text,
  risk_type text,
  current_controls text,
  residual_risk text,
  on_critical_path boolean DEFAULT false
);
```

---

## SLA Management

### sla_configs
```sql
CREATE TABLE public.sla_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  severity severity_level NOT NULL,
  response_minutes integer NOT NULL,
  resolution_minutes integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  at_risk_threshold_percent integer DEFAULT 20,
  description text
);
```

### sla_records
```sql
CREATE TABLE public.sla_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  response_due_at timestamp with time zone NOT NULL,
  response_met_at timestamp with time zone,
  response_breached boolean DEFAULT false,
  resolution_due_at timestamp with time zone NOT NULL,
  resolution_met_at timestamp with time zone,
  resolution_breached boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Slack Integration

### slack_app_config
```sql
CREATE TABLE public.slack_app_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id character varying,
  client_id character varying NOT NULL,
  client_secret_encrypted text NOT NULL,
  signing_secret_encrypted text,
  redirect_uri text NOT NULL,
  bot_scopes text[] DEFAULT ARRAY['chat:write', 'im:write', 'users:read', 'users:read.email', 'channels:read'],
  workspace_id character varying,
  workspace_name character varying,
  workspace_icon_url text,
  bot_user_id character varying,
  bot_access_token_encrypted text,
  is_active boolean DEFAULT false,
  is_configured boolean DEFAULT false,
  ...
);
```

### user_integrations
```sql
CREATE TABLE public.user_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  provider_user_id text,
  provider_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  scopes text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_synced_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb
);
```

---

## Sprints

### sprints
```sql
CREATE TABLE public.sprints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  name text NOT NULL,
  goal text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planning'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  capacity integer,
  velocity integer,
  release_id uuid,
  program_id uuid
);
```

---

## Stories

### stories
```sql
CREATE TABLE public.stories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feature_id uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Backlog'::text,
  story_points integer,
  priority text DEFAULT 'Medium'::text,
  sprint_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  assignee_id uuid,
  reporter_id uuid,
  story_key text,
  labels text[],
  component text,
  acceptance_criteria text,
  technical_notes text,
  parent_story_id uuid,
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  release_id uuid,
  rank integer,
  type text DEFAULT 'story'::text
);
```

### story_statuses
```sql
CREATE TABLE public.story_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  color text DEFAULT 'gray'::text
);
```

---

## Strategic Themes

### themes
```sql
CREATE TABLE public.themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  color text,
  status text DEFAULT 'active'::text,
  owner_id uuid,
  start_date date,
  end_date date,
  created_by uuid,
  health text DEFAULT 'on_track'::text,
  progress integer DEFAULT 0,
  quarter text[],
  business_line_id uuid,
  risk_score integer DEFAULT 0
);
```

### theme_statuses
```sql
CREATE TABLE public.theme_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  color text
);
```

### strategic_snapshots
```sql
CREATE TABLE public.strategic_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'::text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  owner_user_id uuid,
  version_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Objectives & Key Results

### objectives
```sql
CREATE TABLE public.objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid,
  project_id uuid,
  title text NOT NULL,
  description text,
  status text DEFAULT 'committed'::text,
  progress integer DEFAULT 0,
  health text DEFAULT 'on_track'::text,
  start_date date,
  target_date date,
  owner_id uuid,
  theme_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  type text DEFAULT 'team'::text,
  quarter text[],
  level_id uuid,
  business_value integer,
  business_value_achieved integer
);
```

### key_results
```sql
CREATE TABLE public.key_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  metric_type text DEFAULT 'percentage'::text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  status text DEFAULT 'not_started'::text,
  owner_id uuid,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  progress integer DEFAULT 0,
  measurement_method text
);
```

---

## Teams

### teams
```sql
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  program_id uuid,
  project_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  color text,
  type text DEFAULT 'development'::text,
  capacity integer DEFAULT 0,
  velocity integer,
  is_active boolean DEFAULT true,
  abbreviation text,
  image_url text
);
```

### team_members
```sql
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid,
  role text DEFAULT 'member'::text,
  allocation_percentage integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  name text,
  email text,
  job_title text,
  location text,
  start_date date,
  employee_id text,
  department text,
  avatar_url text,
  phone text,
  skills text[],
  seniority_level text,
  employment_type text DEFAULT 'full-time'::text,
  manager_id uuid,
  notes text,
  hourly_rate numeric,
  profile_id uuid
);
```

---

## Test Management (TM)

### tm_test_cases
```sql
CREATE TABLE public.tm_test_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  folder_id uuid,
  key character varying NOT NULL,
  title character varying NOT NULL,
  objective text,
  preconditions text,
  priority tm_priority DEFAULT 'medium',
  type character varying DEFAULT 'functional',
  status tm_case_status DEFAULT 'draft',
  is_automated boolean DEFAULT false,
  automation_id character varying,
  labels text[],
  estimated_time integer,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  component_id uuid
);
```

### tm_test_cycles
```sql
CREATE TABLE public.tm_test_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  release_id uuid,
  name character varying NOT NULL,
  description text,
  status tm_cycle_status DEFAULT 'not_started',
  environment_id uuid,
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### tm_test_runs
```sql
CREATE TABLE public.tm_test_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL,
  test_case_id uuid NOT NULL,
  status tm_execution_status DEFAULT 'not_run',
  executed_by uuid,
  executed_at timestamp with time zone,
  duration_seconds integer,
  comments text,
  defects_found integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_details text,
  version_tested text
);
```

### tm_test_plans
```sql
CREATE TABLE public.tm_test_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft'::text,
  owner_id uuid,
  release_id uuid,
  start_date date,
  end_date date,
  priority text DEFAULT 'medium'::text,
  approach text,
  scope text,
  out_of_scope text,
  entry_criteria text,
  exit_criteria text,
  risks text,
  dependencies text,
  resources text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## Products

### products
```sql
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Views & Dashboards

### dashboard_widgets
```sql
CREATE TABLE public.dashboard_widgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_key text NOT NULL,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  widget_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## Enums (Custom Types)

The database uses several custom enum types:

- `incident_status`: open, in_progress, pending, resolved, closed
- `severity_level`: SEV1, SEV2, SEV3, SEV4
- `priority_level`: critical, high, medium, low
- `support_level`: L1, L2, L3
- `impact_level`: high, medium, low
- `urgency_level`: high, medium, low
- `committee_status`: pending, voting, approved, rejected
- `vote_status`: pending, approved, rejected, abstained
- `change_card_status`: new_awaiting_approval, approved, scheduled, in_progress, completed, rejected
- `compliance_state`: compliant, exception
- `board_scope_type`: global, program, project, team
- `board_type`: kanban, scrum
- `skill_category`: technical, soft, domain, certification
- `skill_proficiency_level`: beginner, intermediate, advanced, expert
- `tm_priority`: low, medium, high, critical
- `tm_case_status`: draft, ready, approved, deprecated
- `tm_cycle_status`: not_started, in_progress, completed, cancelled
- `tm_execution_status`: not_run, passed, failed, blocked, skipped

---

## Notes

- All tables use `uuid` as primary key with `gen_random_uuid()` default
- Most tables include `created_at` and `updated_at` timestamps
- Row Level Security (RLS) is enabled on most tables
- Foreign key relationships connect related tables
- Many tables support soft delete via `deleted_at` column

---

*This dump represents the complete public schema as of 2026-01-19*
