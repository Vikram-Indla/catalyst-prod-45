-- ════════════════════════════════════════════════════════════════════════════
-- Business Requests — drop 89 legacy columns
-- 2026-06-01 | Vikram-locked spec via /design:design-system
--
-- Keeps only the 22 columns rendered by the canonical
-- CatalystViewBusinessRequest.v3 + CreateBusinessRequestModal surfaces:
--
--   System:   id, request_key, title, description, created_at, updated_at,
--             created_by, deleted_at, product_id, rank
--   V3 view:  arabic_title, category, end_date (= "Target date"),
--             planned_quarter (= "Planned release"), po_user_id (= "Product
--             Owner"), process_step (= Status pill), project_manager_user_id
--             (= "Delivery Manager"), request_type (= "Type"), stakeholders,
--             targeted_feature, theme, urgency (= "Priority")
--
-- Everything else is silt from prior generations (Notion-import era, "Demand
-- Hub" era, industry hub, BR-feature unification) that was added but never
-- retired. The dead columns have zero consumer in the v3 surfaces; their
-- old consumer files (BusinessRequestDrawer, drawer-tabs/*, industry/*) are
-- being deleted in the same PR.
--
-- CASCADE drops any FK / view / index dependent on these columns.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE business_requests
  DROP COLUMN IF EXISTS platform CASCADE,
  DROP COLUMN IF EXISTS complexity CASCADE,
  DROP COLUMN IF EXISTS track CASCADE,
  DROP COLUMN IF EXISTS requestor CASCADE,
  DROP COLUMN IF EXISTS business_justification CASCADE,
  DROP COLUMN IF EXISTS start_date CASCADE,
  DROP COLUMN IF EXISTS health CASCADE,
  DROP COLUMN IF EXISTS dependencies CASCADE,
  DROP COLUMN IF EXISTS risk_rating CASCADE,
  DROP COLUMN IF EXISTS portfolio_comments CASCADE,
  DROP COLUMN IF EXISTS delivery_platform CASCADE,
  DROP COLUMN IF EXISTS delivery_track CASCADE,
  DROP COLUMN IF EXISTS proposed_solution CASCADE,
  DROP COLUMN IF EXISTS estimated_effort CASCADE,
  DROP COLUMN IF EXISTS estimated_cost CASCADE,
  DROP COLUMN IF EXISTS integration_required CASCADE,
  DROP COLUMN IF EXISTS integration_systems CASCADE,
  DROP COLUMN IF EXISTS technical_validator CASCADE,
  DROP COLUMN IF EXISTS estimation_notes CASCADE,
  DROP COLUMN IF EXISTS estimation_dependencies CASCADE,
  DROP COLUMN IF EXISTS estimation_risk_rating CASCADE,
  DROP COLUMN IF EXISTS estimated_cost_sar CASCADE,
  DROP COLUMN IF EXISTS approval_inputs CASCADE,
  DROP COLUMN IF EXISTS portfolio_decision CASCADE,
  DROP COLUMN IF EXISTS approver_name CASCADE,
  DROP COLUMN IF EXISTS approval_date CASCADE,
  DROP COLUMN IF EXISTS approval_decision CASCADE,
  DROP COLUMN IF EXISTS approved_budget_ceiling CASCADE,
  DROP COLUMN IF EXISTS approval_remarks CASCADE,
  DROP COLUMN IF EXISTS functional_spec_link CASCADE,
  DROP COLUMN IF EXISTS acceptance_criteria CASCADE,
  DROP COLUMN IF EXISTS environment_dependency CASCADE,
  DROP COLUMN IF EXISTS readiness_checklist CASCADE,
  DROP COLUMN IF EXISTS implementation_owner CASCADE,
  DROP COLUMN IF EXISTS impl_start_date CASCADE,
  DROP COLUMN IF EXISTS impl_target_end_date CASCADE,
  DROP COLUMN IF EXISTS key_risks_remarks CASCADE,
  DROP COLUMN IF EXISTS outcome_summary CASCADE,
  DROP COLUMN IF EXISTS qa_remarks CASCADE,
  DROP COLUMN IF EXISTS support_owner CASCADE,
  DROP COLUMN IF EXISTS support_remarks CASCADE,
  DROP COLUMN IF EXISTS resolution_category CASCADE,
  DROP COLUMN IF EXISTS implementation_outcome CASCADE,
  DROP COLUMN IF EXISTS on_hold_reason CASCADE,
  DROP COLUMN IF EXISTS expected_resume_date CASCADE,
  DROP COLUMN IF EXISTS on_hold_comment CASCADE,
  DROP COLUMN IF EXISTS rank_override_justification CASCADE,
  DROP COLUMN IF EXISTS business_score CASCADE,
  DROP COLUMN IF EXISTS business_value CASCADE,
  DROP COLUMN IF EXISTS is_force_ranked CASCADE,
  DROP COLUMN IF EXISTS force_ranked_by CASCADE,
  DROP COLUMN IF EXISTS force_ranked_at CASCADE,
  DROP COLUMN IF EXISTS department CASCADE,
  DROP COLUMN IF EXISTS business_owner CASCADE,
  DROP COLUMN IF EXISTS assignee CASCADE,
  DROP COLUMN IF EXISTS funding_status CASCADE,
  DROP COLUMN IF EXISTS budget_year CASCADE,
  DROP COLUMN IF EXISTS budget_type CASCADE,
  DROP COLUMN IF EXISTS approved_budget_sar CASCADE,
  DROP COLUMN IF EXISTS current_year_budget_sar CASCADE,
  DROP COLUMN IF EXISTS budget_owner_name CASCADE,
  DROP COLUMN IF EXISTS planned_external_spend_sar CASCADE,
  DROP COLUMN IF EXISTS internal_effort_cost_sar CASCADE,
  DROP COLUMN IF EXISTS contract_type CASCADE,
  DROP COLUMN IF EXISTS primary_vendor_name CASCADE,
  DROP COLUMN IF EXISTS po_numbers CASCADE,
  DROP COLUMN IF EXISTS contract_start_date CASCADE,
  DROP COLUMN IF EXISTS contract_end_date CASCADE,
  DROP COLUMN IF EXISTS delivery_model CASCADE,
  DROP COLUMN IF EXISTS capacity_status CASCADE,
  DROP COLUMN IF EXISTS internal_effort_pct CASCADE,
  DROP COLUMN IF EXISTS vendor_effort_pct CASCADE,
  DROP COLUMN IF EXISTS funding_assumptions CASCADE,
  DROP COLUMN IF EXISTS capacity_risks CASCADE,
  DROP COLUMN IF EXISTS department_id CASCADE,
  DROP COLUMN IF EXISTS business_owner_id CASCADE,
  DROP COLUMN IF EXISTS score_strategic_alignment CASCADE,
  DROP COLUMN IF EXISTS score_time_urgency CASCADE,
  DROP COLUMN IF EXISTS score_resource_feasibility CASCADE,
  DROP COLUMN IF EXISTS priority_tier CASCADE,
  DROP COLUMN IF EXISTS progress CASCADE,
  DROP COLUMN IF EXISTS ea_review_required CASCADE,
  DROP COLUMN IF EXISTS end_date_locked CASCADE,
  DROP COLUMN IF EXISTS end_date_locked_by CASCADE,
  DROP COLUMN IF EXISTS end_date_locked_at CASCADE,
  DROP COLUMN IF EXISTS import_source CASCADE,
  DROP COLUMN IF EXISTS import_ref CASCADE,
  DROP COLUMN IF EXISTS scope_url CASCADE,
  DROP COLUMN IF EXISTS intervention_active CASCADE;
