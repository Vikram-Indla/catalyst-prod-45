-- ============================================================================
-- STRATA — DEMO SEED (Salam reference tenant) — Q8: demo data ONLY
-- CAT-STRATA-20260705-001 · Blueprint §1/App C/App F: Salam is a reference
-- implementation, never a hard-coded tenant model. Everything below is
-- governed CONFIG + demo DATA an admin could recreate through the UI.
-- Idempotent: skips entirely if the demo cycle already exists.
-- ============================================================================

DO $seed$
DECLARE
  demo_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = 'a5a1a000-0000-4000-8000-000000001001') INTO demo_exists;
  IF demo_exists THEN
    RAISE NOTICE 'STRATA demo seed already present — skipping';
    RETURN;
  END IF;

  -- ── Perspectives (approved demo config) ────────────────────────────────
  INSERT INTO public.strata_perspectives (id, name, slug, description, order_index, default_weight, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000000101','Financial','financial','Revenue growth, profitability and cost discipline',0,30,'approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000102','Customer','customer','Customer experience, retention and trust',1,25,'approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000103','Digital','digital','Digital channels, products and platform adoption',2,20,'approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000104','People','people','Capability, engagement and leadership bench',3,15,'approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000105','ESG','esg','Environmental, social and governance commitments',4,10,'approved',now(),now(),'DEMO SEED (Salam reference tenant)');

  -- ── Threshold scheme (governed RAG bands — no constants in code) ───────
  INSERT INTO public.strata_threshold_schemes (id, name, slug, description, bands, tolerance, confidence_threshold, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000000201','Salam Standard RAG','salam-standard-rag','Default executive banding',
     '[{"key":"green","label":"On track","min_score":85,"appearance":"success"},{"key":"amber","label":"Watch","min_score":60,"appearance":"moved"},{"key":"red","label":"At risk","min_score":0,"appearance":"removed"}]'::jsonb,
     5, 0.7, 'approved', now(), now(), 'DEMO SEED (Salam reference tenant)');

  -- ── Value taxonomy ──────────────────────────────────────────────────────
  INSERT INTO public.strata_value_categories (id, name, slug, measurement_unit, validator_role, realization_cadence, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000000301','Revenue','revenue','SAR','vmo_validator','quarterly','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000302','Cost Efficiency','cost-efficiency','SAR','vmo_validator','quarterly','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000303','Customer Experience','customer-experience','index','vmo_validator','quarterly','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000304','Risk Mitigation','risk-mitigation','SAR','vmo_validator','half_yearly','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000305','Capability','capability','index','vmo_validator','half_yearly','approved',now(),now(),'DEMO SEED (Salam reference tenant)');

  -- ── Gate model + stages ────────────────────────────────────────────────
  INSERT INTO public.strata_gate_models (id, name, slug, description, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000000401','Investment Gates','investment-gates','Idea → business case → design → go-live → realization','approved',now(),now(),'DEMO SEED (Salam reference tenant)');
  INSERT INTO public.strata_gate_model_stages (id, gate_model_id, stage_key, name, order_index, criteria, decision_options, approval_roles) VALUES
    ('a5a1a000-0000-4000-8000-000000000411','a5a1a000-0000-4000-8000-000000000401','idea','Idea',0,'[{"key":"problem_defined","label":"Problem and outcome defined","required":true}]','{approve,pivot,stop}','{strategy_office}'),
    ('a5a1a000-0000-4000-8000-000000000412','a5a1a000-0000-4000-8000-000000000401','business_case','Business Case & Funding',1,'[{"key":"value_thesis","label":"Value thesis with baseline","required":true},{"key":"funding","label":"Funding envelope approved","required":true}]','{approve,rebaseline,pause,stop}','{strategy_office,vmo_validator}'),
    ('a5a1a000-0000-4000-8000-000000000413','a5a1a000-0000-4000-8000-000000000401','design','Design',2,'[{"key":"architecture","label":"Solution architecture signed off","required":true}]','{approve,rebaseline,pause,stop}','{strategy_office}'),
    ('a5a1a000-0000-4000-8000-000000000414','a5a1a000-0000-4000-8000-000000000401','go_live','Go-Live',3,'[{"key":"readiness","label":"Operational readiness confirmed","required":true}]','{approve,pause,stop}','{strategy_office}'),
    ('a5a1a000-0000-4000-8000-000000000415','a5a1a000-0000-4000-8000-000000000401','realization','Realization',4,'[{"key":"benefit_evidence","label":"Realized value validated by finance","required":true}]','{continue,accelerate,rebaseline,pivot,stop}','{strategy_office,vmo_validator}');

  -- ── KPI type configs ───────────────────────────────────────────────────
  INSERT INTO public.strata_kpi_type_configs (id, name, slug, formula_template, directionality, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000000501','Ratio to Target','ratio-to-target','ratio_to_target','higher_better','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000502','Lower is Better','lower-is-better','inverse_ratio','lower_better','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000503','Target Band','target-band','band','band','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000000504','Manual Index','manual-index','manual','manual','approved',now(),now(),'DEMO SEED (Salam reference tenant)');

  -- ── Upload template ────────────────────────────────────────────────────
  INSERT INTO public.strata_upload_templates (id, name, slug, target_entity, column_schema, validation_rules, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000000601','KPI Actuals (Quarterly)','kpi-actuals-quarterly','kpi_actual',
     '[{"column":"kpi_slug","label":"KPI","type":"text","required":true},{"column":"period","label":"Period","type":"text","required":true},{"column":"value","label":"Actual value","type":"number","required":true},{"column":"confidence","label":"Confidence (0-1)","type":"number","required":false}]'::jsonb,
     '[{"rule":"kpi_exists","severity":"error"},{"rule":"period_open","severity":"error"},{"rule":"value_numeric","severity":"error"}]'::jsonb,
     'approved', now(), now(), 'DEMO SEED (Salam reference tenant)');

  -- ── Workflow config (strategy element lifecycle) ───────────────────────
  INSERT INTO public.strata_workflow_configs (id, name, slug, entity_type, states, transitions, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000000701','Strategy Element Lifecycle','strategy-element-lifecycle','strategy_element',
     '[{"key":"draft","label":"Draft"},{"key":"proposed","label":"Proposed"},{"key":"active","label":"Active"},{"key":"on_hold","label":"On hold"},{"key":"retired","label":"Retired"}]'::jsonb,
     '[{"from":"draft","to":"proposed","roles":["strategy_office"]},{"from":"proposed","to":"active","roles":["strategy_office"],"requires_note":true},{"from":"active","to":"on_hold","roles":["strategy_office"]},{"from":"on_hold","to":"active","roles":["strategy_office"]},{"from":"active","to":"retired","roles":["strategy_office"],"requires_note":true}]'::jsonb,
     'approved', now(), now(), 'DEMO SEED (Salam reference tenant)');

  -- ── Cycle + periods ────────────────────────────────────────────────────
  INSERT INTO public.strata_cycles (id, name, slug, description, starts_on, ends_on, period_granularity, status) VALUES
    ('a5a1a000-0000-4000-8000-000000001001','FY2026','fy2026','DEMO SEED (Salam reference tenant) — annual strategy cycle','2026-01-01','2026-12-31','quarter','active');
  INSERT INTO public.strata_periods (id, cycle_id, name, period_type, starts_on, ends_on, close_status) VALUES
    ('a5a1a000-0000-4000-8000-000000001011','a5a1a000-0000-4000-8000-000000001001','Q1 FY2026','quarter','2026-01-01','2026-03-31','closed'),
    ('a5a1a000-0000-4000-8000-000000001012','a5a1a000-0000-4000-8000-000000001001','Q2 FY2026','quarter','2026-04-01','2026-06-30','open'),
    ('a5a1a000-0000-4000-8000-000000001013','a5a1a000-0000-4000-8000-000000001001','Q3 FY2026','quarter','2026-07-01','2026-09-30','open'),
    ('a5a1a000-0000-4000-8000-000000001014','a5a1a000-0000-4000-8000-000000001001','Q4 FY2026','quarter','2026-10-01','2026-12-31','open');

  -- ── Strategy hierarchy + map ───────────────────────────────────────────
  INSERT INTO public.strata_strategy_elements (id, cycle_id, element_type, name, slug, description, parent_id, perspective_id, stage, status, order_index, map_position) VALUES
    ('a5a1a000-0000-4000-8000-000000001101','a5a1a000-0000-4000-8000-000000001001','theme','Digital Market Leadership','digital-market-leadership','Win the B2B and digital consumer market on network quality and service.',NULL,NULL,'active','active',0,'{"x":480,"y":40}'),
    ('a5a1a000-0000-4000-8000-000000001102','a5a1a000-0000-4000-8000-000000001001','play','B2B Growth Engine','b2b-growth-engine','Scale enterprise revenue through solution selling and digital care.','a5a1a000-0000-4000-8000-000000001101','a5a1a000-0000-4000-8000-000000000101','active','active',0,'{"x":240,"y":200}'),
    ('a5a1a000-0000-4000-8000-000000001103','a5a1a000-0000-4000-8000-000000001001','play','Network Excellence','network-excellence','Lead the market on availability and experience-grade quality.','a5a1a000-0000-4000-8000-000000001101','a5a1a000-0000-4000-8000-000000000102','active','active',1,'{"x":720,"y":200}'),
    ('a5a1a000-0000-4000-8000-000000001111','a5a1a000-0000-4000-8000-000000001001','objective','Grow B2B Revenue','grow-b2b-revenue','Grow B2B revenue 8% YoY with margin discipline.','a5a1a000-0000-4000-8000-000000001102','a5a1a000-0000-4000-8000-000000000101','active','active',0,'{"x":80,"y":380}'),
    ('a5a1a000-0000-4000-8000-000000001112','a5a1a000-0000-4000-8000-000000001001','objective','Improve Customer Retention','improve-customer-retention','Reduce churn below 2% and lift NPS above 62.','a5a1a000-0000-4000-8000-000000001102','a5a1a000-0000-4000-8000-000000000102','active','active',1,'{"x":360,"y":380}'),
    ('a5a1a000-0000-4000-8000-000000001113','a5a1a000-0000-4000-8000-000000001001','objective','Accelerate Digital Channels','accelerate-digital-channels','Grow digital revenue share beyond 35%.','a5a1a000-0000-4000-8000-000000001103','a5a1a000-0000-4000-8000-000000000103','active','active',0,'{"x":620,"y":380}'),
    ('a5a1a000-0000-4000-8000-000000001114','a5a1a000-0000-4000-8000-000000001001','objective','Network Quality Leadership','network-quality-leadership','Hold availability inside the 99.5–100% band.','a5a1a000-0000-4000-8000-000000001103','a5a1a000-0000-4000-8000-000000000102','active','active',1,'{"x":880,"y":380}');

  INSERT INTO public.strata_map_edges (cycle_id, from_element_id, to_element_id, relationship_type, confidence) VALUES
    ('a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001111','a5a1a000-0000-4000-8000-000000001102','drives',0.9),
    ('a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001112','a5a1a000-0000-4000-8000-000000001102','drives',0.8),
    ('a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001113','a5a1a000-0000-4000-8000-000000001103','drives',0.85),
    ('a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001114','a5a1a000-0000-4000-8000-000000001103','drives',0.9),
    ('a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001102','a5a1a000-0000-4000-8000-000000001101','contributes_to',0.9),
    ('a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001103','a5a1a000-0000-4000-8000-000000001101','contributes_to',0.85),
    ('a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001114','a5a1a000-0000-4000-8000-000000001112','enables',0.7);

  INSERT INTO public.strata_play_charters (element_id, hypothesis, scope, value_thesis, gate_model_id, owner_id, status) VALUES
    ('a5a1a000-0000-4000-8000-000000001102','Solution selling + digital care lifts B2B revenue ≥8% while holding cost-to-serve flat.','Enterprise and SMB segments, KSA.','SAR 24M incremental revenue in FY2026.','a5a1a000-0000-4000-8000-000000000401',NULL,'complete'),
    ('a5a1a000-0000-4000-8000-000000001103','Experience-grade network quality reduces churn and defends premium pricing.','National RAN + core.','SAR 9M churn-value protection in FY2026.','a5a1a000-0000-4000-8000-000000000401',NULL,'complete');

  -- ── Data sources ───────────────────────────────────────────────────────
  INSERT INTO public.strata_data_sources (id, name, slug, system_type, refresh_cadence, status) VALUES
    ('a5a1a000-0000-4000-8000-000000001301','Salam Finance Excel','salam-finance-excel','excel','quarterly','active'),
    ('a5a1a000-0000-4000-8000-000000001302','Salam BI Extract','salam-bi-extract','bi','monthly','registered');

  -- ── KPIs (approved demo dictionary) ────────────────────────────────────
  INSERT INTO public.strata_kpis (id, name, slug, description, kpi_type_id, unit, direction, frequency, entry_method, data_source_id, threshold_scheme_id, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000001201','B2B Revenue Growth','b2b-revenue-growth','YoY B2B revenue growth','a5a1a000-0000-4000-8000-000000000501','%','higher_better','quarterly','upload','a5a1a000-0000-4000-8000-000000001301','a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000001202','Churn Rate','churn-rate','Blended monthly churn','a5a1a000-0000-4000-8000-000000000502','%','lower_better','quarterly','upload','a5a1a000-0000-4000-8000-000000001301','a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000001203','Net Promoter Score','net-promoter-score','Relationship NPS','a5a1a000-0000-4000-8000-000000000501','index','higher_better','quarterly','upload','a5a1a000-0000-4000-8000-000000001302','a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000001204','Digital Revenue Share','digital-revenue-share','Share of revenue through digital channels','a5a1a000-0000-4000-8000-000000000501','%','higher_better','quarterly','upload','a5a1a000-0000-4000-8000-000000001302','a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000001205','Network Availability','network-availability','Availability inside the contractual band','a5a1a000-0000-4000-8000-000000000503','%','band','quarterly','upload','a5a1a000-0000-4000-8000-000000001302','a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000001206','Cost to Serve','cost-to-serve','Cost to serve per subscriber','a5a1a000-0000-4000-8000-000000000502','SAR','lower_better','quarterly','upload','a5a1a000-0000-4000-8000-000000001301','a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000001207','Employee Engagement','employee-engagement','Engagement index','a5a1a000-0000-4000-8000-000000000501','index','higher_better','quarterly','manual',NULL,'a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)'),
    ('a5a1a000-0000-4000-8000-000000001208','CO2 Reduction','co2-reduction','Reduction vs FY2024 baseline','a5a1a000-0000-4000-8000-000000000501','%','higher_better','quarterly','manual',NULL,'a5a1a000-0000-4000-8000-000000000201','approved',now(),now(),'DEMO SEED (Salam reference tenant)');

  -- Formula versions (v1, approved)
  INSERT INTO public.strata_kpi_formula_versions (kpi_id, version, expression, variables, formula_type, status, approved_at, effective_from)
  SELECT k.id, 1,
         CASE k.direction WHEN 'lower_better' THEN 'target / actual * 100'
                          WHEN 'band' THEN 'within [band_min, band_max] → 100; else tolerance-scaled'
                          ELSE 'actual / target * 100' END,
         '{}'::jsonb,
         CASE k.direction WHEN 'band' THEN 'band' WHEN 'lower_better' THEN 'inverse_ratio' ELSE 'ratio_to_target' END,
         'approved', now(), now()
    FROM public.strata_kpis k WHERE k.id::text LIKE 'a5a1a000-0000-4000-8000-0000000012%';

  -- Element ↔ KPI attribution
  INSERT INTO public.strata_element_kpis (element_id, kpi_id, weight) VALUES
    ('a5a1a000-0000-4000-8000-000000001111','a5a1a000-0000-4000-8000-000000001201',100),
    ('a5a1a000-0000-4000-8000-000000001112','a5a1a000-0000-4000-8000-000000001202',60),
    ('a5a1a000-0000-4000-8000-000000001112','a5a1a000-0000-4000-8000-000000001203',40),
    ('a5a1a000-0000-4000-8000-000000001113','a5a1a000-0000-4000-8000-000000001204',100),
    ('a5a1a000-0000-4000-8000-000000001114','a5a1a000-0000-4000-8000-000000001205',100),
    ('a5a1a000-0000-4000-8000-000000001102','a5a1a000-0000-4000-8000-000000001201',60),
    ('a5a1a000-0000-4000-8000-000000001102','a5a1a000-0000-4000-8000-000000001204',40),
    ('a5a1a000-0000-4000-8000-000000001103','a5a1a000-0000-4000-8000-000000001205',60),
    ('a5a1a000-0000-4000-8000-000000001103','a5a1a000-0000-4000-8000-000000001206',40);

  -- Targets Q1 + Q2
  INSERT INTO public.strata_kpi_targets (kpi_id, period_id, baseline, target, band_min, band_max, tolerance, target_type, status, approved_at)
  SELECT x.kpi, p.id, x.baseline, x.target, x.band_min, x.band_max, x.tolerance, x.ttype, 'approved', now()
  FROM (VALUES
    ('a5a1a000-0000-4000-8000-000000001201'::uuid, 4.0, 8.0, NULL::numeric, NULL::numeric, NULL::numeric, 'point'),
    ('a5a1a000-0000-4000-8000-000000001202'::uuid, 2.8, 2.0, NULL, NULL, NULL, 'point'),
    ('a5a1a000-0000-4000-8000-000000001203'::uuid, 54,  62,  NULL, NULL, NULL, 'point'),
    ('a5a1a000-0000-4000-8000-000000001204'::uuid, 28,  35,  NULL, NULL, NULL, 'point'),
    ('a5a1a000-0000-4000-8000-000000001205'::uuid, 99.4,99.9,99.5, 100,  0.3,  'band'),
    ('a5a1a000-0000-4000-8000-000000001206'::uuid, 108, 95,  NULL, NULL, NULL, 'point'),
    ('a5a1a000-0000-4000-8000-000000001207'::uuid, 68,  75,  NULL, NULL, NULL, 'point'),
    ('a5a1a000-0000-4000-8000-000000001208'::uuid, 5,   12,  NULL, NULL, NULL, 'point')
  ) AS x(kpi, baseline, target, band_min, band_max, tolerance, ttype)
  CROSS JOIN (SELECT id FROM public.strata_periods WHERE id IN ('a5a1a000-0000-4000-8000-000000001011','a5a1a000-0000-4000-8000-000000001012')) p;

  -- ── Upload run with staged rows + row-level validation (Flow 1) ────────
  INSERT INTO public.strata_upload_runs (id, run_key, data_source_id, template_id, template_version, channel, storage_path, file_name, file_hash, row_count_raw, row_count_valid, row_count_rejected, status, started_at, completed_at) VALUES
    ('a5a1a000-0000-4000-8000-000000001401','RUN-1001','a5a1a000-0000-4000-8000-000000001301','a5a1a000-0000-4000-8000-000000000601',1,'excel',
     'strata-uploads/demo/salam_kpi_actuals_q2_fy2026.xlsx','salam_kpi_actuals_q2_fy2026.xlsx',
     'sha256:demo-4f2c1b8a90dd05e7a63b3f2b0c9d1e4a', 9, 8, 1, 'completed', now() - interval '2 days', now() - interval '2 days' + interval '4 minutes');

  INSERT INTO public.strata_staging_rows (id, upload_run_id, row_number, raw, target_entity, validation_status) VALUES
    ('a5a1a000-0000-4000-8000-000000001421','a5a1a000-0000-4000-8000-000000001401',1,'{"kpi_slug":"b2b-revenue-growth","period":"Q2 FY2026","value":8.9,"confidence":0.95}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001422','a5a1a000-0000-4000-8000-000000001401',2,'{"kpi_slug":"churn-rate","period":"Q2 FY2026","value":1.9,"confidence":0.9}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001423','a5a1a000-0000-4000-8000-000000001401',3,'{"kpi_slug":"net-promoter-score","period":"Q2 FY2026","value":63,"confidence":0.85}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001424','a5a1a000-0000-4000-8000-000000001401',4,'{"kpi_slug":"digital-revenue-share","period":"Q2 FY2026","value":36,"confidence":0.9}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001425','a5a1a000-0000-4000-8000-000000001401',5,'{"kpi_slug":"network-availability","period":"Q2 FY2026","value":99.4,"confidence":0.98}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001426','a5a1a000-0000-4000-8000-000000001401',6,'{"kpi_slug":"cost-to-serve","period":"Q2 FY2026","value":97,"confidence":0.9}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001427','a5a1a000-0000-4000-8000-000000001401',7,'{"kpi_slug":"employee-engagement","period":"Q2 FY2026","value":74,"confidence":0.8}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001428','a5a1a000-0000-4000-8000-000000001401',8,'{"kpi_slug":"co2-reduction","period":"Q2 FY2026","value":11,"confidence":0.8}','kpi_actual','valid'),
    ('a5a1a000-0000-4000-8000-000000001429','a5a1a000-0000-4000-8000-000000001401',9,'{"kpi_slug":"arpu-uplift","period":"Q2 FY2026","value":"n/a"}','kpi_actual','rejected');

  INSERT INTO public.strata_validation_results (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix) VALUES
    ('a5a1a000-0000-4000-8000-000000001401','a5a1a000-0000-4000-8000-000000001429','kpi_slug','KPI_NOT_FOUND','error','KPI ''arpu-uplift'' is not a registered, approved KPI.','Register the KPI in the library or correct the slug.'),
    ('a5a1a000-0000-4000-8000-000000001401','a5a1a000-0000-4000-8000-000000001429','value','VALUE_NOT_NUMERIC','error','Value ''n/a'' is not numeric.','Provide a numeric actual.');

  -- ── Actuals: Q1 (manual, validated) + Q2 (from the upload run, validated)
  INSERT INTO public.strata_kpi_actuals (kpi_id, period_id, value, entry_method, validation_status, validated_at, confidence)
  SELECT x.kpi, 'a5a1a000-0000-4000-8000-000000001011'::uuid, x.val, 'manual', 'validated', now() - interval '80 days', x.conf
  FROM (VALUES
    ('a5a1a000-0000-4000-8000-000000001201'::uuid, 6.2::numeric, 0.95::numeric),
    ('a5a1a000-0000-4000-8000-000000001202'::uuid, 2.4, 0.9),
    ('a5a1a000-0000-4000-8000-000000001203'::uuid, 58, 0.85),
    ('a5a1a000-0000-4000-8000-000000001204'::uuid, 31, 0.9),
    ('a5a1a000-0000-4000-8000-000000001205'::uuid, 99.7, 0.98),
    ('a5a1a000-0000-4000-8000-000000001206'::uuid, 101, 0.9),
    ('a5a1a000-0000-4000-8000-000000001207'::uuid, 71, 0.8),
    ('a5a1a000-0000-4000-8000-000000001208'::uuid, 9, 0.8)
  ) AS x(kpi, val, conf);

  INSERT INTO public.strata_kpi_actuals (kpi_id, period_id, value, entry_method, upload_run_id, staging_row_id, validation_status, validated_at, confidence)
  SELECT x.kpi, 'a5a1a000-0000-4000-8000-000000001012'::uuid, x.val, 'upload',
         'a5a1a000-0000-4000-8000-000000001401'::uuid, x.row_id, 'validated', now() - interval '1 day', x.conf
  FROM (VALUES
    ('a5a1a000-0000-4000-8000-000000001201'::uuid, 8.9::numeric,  'a5a1a000-0000-4000-8000-000000001421'::uuid, 0.95::numeric),
    ('a5a1a000-0000-4000-8000-000000001202'::uuid, 1.9,  'a5a1a000-0000-4000-8000-000000001422'::uuid, 0.9),
    ('a5a1a000-0000-4000-8000-000000001203'::uuid, 63,   'a5a1a000-0000-4000-8000-000000001423'::uuid, 0.85),
    ('a5a1a000-0000-4000-8000-000000001204'::uuid, 36,   'a5a1a000-0000-4000-8000-000000001424'::uuid, 0.9),
    ('a5a1a000-0000-4000-8000-000000001205'::uuid, 99.4, 'a5a1a000-0000-4000-8000-000000001425'::uuid, 0.98),
    ('a5a1a000-0000-4000-8000-000000001206'::uuid, 97,   'a5a1a000-0000-4000-8000-000000001426'::uuid, 0.9),
    ('a5a1a000-0000-4000-8000-000000001207'::uuid, 74,   'a5a1a000-0000-4000-8000-000000001427'::uuid, 0.8),
    ('a5a1a000-0000-4000-8000-000000001208'::uuid, 11,   'a5a1a000-0000-4000-8000-000000001428'::uuid, 0.8)
  ) AS x(kpi, val, row_id, conf);

  -- Canonical-write lineage records for the Q2 actuals
  INSERT INTO public.strata_lineage_records (entity_table, entity_id, upload_run_id, staging_row_id, config_context)
  SELECT 'strata_kpi_actuals', a.id, a.upload_run_id, a.staging_row_id,
         jsonb_build_object('template_id','a5a1a000-0000-4000-8000-000000000601','template_version',1)
    FROM public.strata_kpi_actuals a
   WHERE a.upload_run_id = 'a5a1a000-0000-4000-8000-000000001401';

  -- ── CEO scorecard model + instances + lines ────────────────────────────
  INSERT INTO public.strata_scorecard_models (id, name, slug, description, owner_scope_type, rollup_method, threshold_scheme_id, period_granularity, status, approved_at, effective_from, change_reason) VALUES
    ('a5a1a000-0000-4000-8000-000000001501','CEO Enterprise Scorecard','ceo-enterprise-scorecard','Enterprise health across the five configured perspectives','enterprise','weighted_average','a5a1a000-0000-4000-8000-000000000201','quarter','approved',now(),now(),'DEMO SEED (Salam reference tenant)');
  INSERT INTO public.strata_scorecard_model_perspectives (model_id, perspective_id, weight, order_index) VALUES
    ('a5a1a000-0000-4000-8000-000000001501','a5a1a000-0000-4000-8000-000000000101',30,0),
    ('a5a1a000-0000-4000-8000-000000001501','a5a1a000-0000-4000-8000-000000000102',25,1),
    ('a5a1a000-0000-4000-8000-000000001501','a5a1a000-0000-4000-8000-000000000103',20,2),
    ('a5a1a000-0000-4000-8000-000000001501','a5a1a000-0000-4000-8000-000000000104',15,3),
    ('a5a1a000-0000-4000-8000-000000001501','a5a1a000-0000-4000-8000-000000000105',10,4);

  INSERT INTO public.strata_scorecard_instances (id, model_id, model_version, cycle_id, period_id, name, slug, status) VALUES
    ('a5a1a000-0000-4000-8000-000000001511','a5a1a000-0000-4000-8000-000000001501',1,'a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001011','CEO Scorecard · Q1 FY2026','ceo-scorecard-q1-fy2026','live'),
    ('a5a1a000-0000-4000-8000-000000001512','a5a1a000-0000-4000-8000-000000001501',1,'a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001012','CEO Scorecard · Q2 FY2026','ceo-scorecard-q2-fy2026','live');

  INSERT INTO public.strata_scorecard_lines (instance_id, perspective_id, ref_type, kpi_id, weight, order_index)
  SELECT inst.id, x.persp, 'kpi', x.kpi, x.w, x.ord
  FROM (VALUES
    ('a5a1a000-0000-4000-8000-000000000101'::uuid,'a5a1a000-0000-4000-8000-000000001201'::uuid, 60, 0),
    ('a5a1a000-0000-4000-8000-000000000101'::uuid,'a5a1a000-0000-4000-8000-000000001206'::uuid, 40, 1),
    ('a5a1a000-0000-4000-8000-000000000102'::uuid,'a5a1a000-0000-4000-8000-000000001202'::uuid, 55, 2),
    ('a5a1a000-0000-4000-8000-000000000102'::uuid,'a5a1a000-0000-4000-8000-000000001203'::uuid, 45, 3),
    ('a5a1a000-0000-4000-8000-000000000103'::uuid,'a5a1a000-0000-4000-8000-000000001204'::uuid, 60, 4),
    ('a5a1a000-0000-4000-8000-000000000103'::uuid,'a5a1a000-0000-4000-8000-000000001205'::uuid, 40, 5),
    ('a5a1a000-0000-4000-8000-000000000104'::uuid,'a5a1a000-0000-4000-8000-000000001207'::uuid,100, 6),
    ('a5a1a000-0000-4000-8000-000000000105'::uuid,'a5a1a000-0000-4000-8000-000000001208'::uuid,100, 7)
  ) AS x(persp, kpi, w, ord)
  CROSS JOIN (SELECT id FROM public.strata_scorecard_instances
              WHERE id IN ('a5a1a000-0000-4000-8000-000000001511','a5a1a000-0000-4000-8000-000000001512')) inst;

  -- ── Execution: initiatives, project cards, milestones, dependencies ────
  INSERT INTO public.strata_initiatives (id, cycle_id, name, slug, description, stage, status, budget_envelope, value_hypothesis) VALUES
    ('a5a1a000-0000-4000-8000-000000001601','a5a1a000-0000-4000-8000-000000001001','B2B Sales Transformation','b2b-sales-transformation','Solution-selling operating model, CPQ tooling and enterprise care.','delivery','active', 18000000,'SAR 24M incremental B2B revenue by FY2026 exit.'),
    ('a5a1a000-0000-4000-8000-000000001602','a5a1a000-0000-4000-8000-000000001001','5G Network Expansion','5g-network-expansion','Densify 5G coverage in tier-1 cities; modernize core.','delivery','active', 42000000,'Availability inside band; churn-value protection SAR 9M.'),
    ('a5a1a000-0000-4000-8000-000000001603','a5a1a000-0000-4000-8000-000000001001','Digital Care Platform','digital-care-platform','Self-service app + AI care deflection.','design','active', 12000000,'Digital share ≥35%; SAR 8M cost-to-serve reduction.');

  INSERT INTO public.strata_initiative_elements (initiative_id, element_id, contribution_weight) VALUES
    ('a5a1a000-0000-4000-8000-000000001601','a5a1a000-0000-4000-8000-000000001111',100),
    ('a5a1a000-0000-4000-8000-000000001602','a5a1a000-0000-4000-8000-000000001114',70),
    ('a5a1a000-0000-4000-8000-000000001602','a5a1a000-0000-4000-8000-000000001112',30),
    ('a5a1a000-0000-4000-8000-000000001603','a5a1a000-0000-4000-8000-000000001113',60),
    ('a5a1a000-0000-4000-8000-000000001603','a5a1a000-0000-4000-8000-000000001112',40);

  INSERT INTO public.strata_initiative_kpis (initiative_id, kpi_id) VALUES
    ('a5a1a000-0000-4000-8000-000000001601','a5a1a000-0000-4000-8000-000000001201'),
    ('a5a1a000-0000-4000-8000-000000001602','a5a1a000-0000-4000-8000-000000001205'),
    ('a5a1a000-0000-4000-8000-000000001602','a5a1a000-0000-4000-8000-000000001202'),
    ('a5a1a000-0000-4000-8000-000000001603','a5a1a000-0000-4000-8000-000000001204'),
    ('a5a1a000-0000-4000-8000-000000001603','a5a1a000-0000-4000-8000-000000001206');

  INSERT INTO public.strata_project_cards (id, name, slug, source_system, source_key, sector, budget, baseline_start, baseline_end, forecast_end, stage, sync_metadata, last_synced_at) VALUES
    ('a5a1a000-0000-4000-8000-000000001611','CPQ & Sales Enablement','cpq-sales-enablement','jira','SLM','Enterprise', 8000000,'2026-01-15','2026-09-30','2026-10-15','active','{"connector":"jira","mapped_by":"demo-seed"}', now() - interval '6 hours'),
    ('a5a1a000-0000-4000-8000-000000001612','5G Rollout Wave 2','5g-rollout-wave-2','jira','NET5G','Network', 26000000,'2026-02-01','2026-11-30',NULL,'active','{"connector":"jira","mapped_by":"demo-seed"}', now() - interval '6 hours'),
    ('a5a1a000-0000-4000-8000-000000001613','Care App v3','care-app-v3','manual',NULL,'Digital', 7000000,'2026-03-01','2026-08-31','2026-09-20','active',NULL,NULL),
    ('a5a1a000-0000-4000-8000-000000001614','Enterprise Care Desk','enterprise-care-desk','upload',NULL,'Enterprise', 3000000,'2026-04-01','2026-12-15',NULL,'active',NULL,NULL);

  INSERT INTO public.strata_initiative_projects (initiative_id, project_card_id, mapping_confidence) VALUES
    ('a5a1a000-0000-4000-8000-000000001601','a5a1a000-0000-4000-8000-000000001611',0.95),
    ('a5a1a000-0000-4000-8000-000000001601','a5a1a000-0000-4000-8000-000000001614',0.75),
    ('a5a1a000-0000-4000-8000-000000001602','a5a1a000-0000-4000-8000-000000001612',0.95),
    ('a5a1a000-0000-4000-8000-000000001603','a5a1a000-0000-4000-8000-000000001613',0.9);

  INSERT INTO public.strata_milestones (project_card_id, name, baseline_start, baseline_end, forecast_date, actual_date, status, progress, weight, order_index) VALUES
    ('a5a1a000-0000-4000-8000-000000001611','CPQ vendor selected','2026-01-15','2026-02-28',NULL,'2026-02-20','done',100,1,0),
    ('a5a1a000-0000-4000-8000-000000001611','Pilot with 5 accounts','2026-03-01','2026-05-31',NULL,'2026-06-10','done',100,2,1),
    ('a5a1a000-0000-4000-8000-000000001611','National rollout','2026-06-01','2026-09-30','2026-10-15',NULL,'in_progress',45,3,2),
    ('a5a1a000-0000-4000-8000-000000001612','Wave 2 site acquisition','2026-02-01','2026-04-30',NULL,'2026-04-28','done',100,2,0),
    ('a5a1a000-0000-4000-8000-000000001612','400 sites on air','2026-05-01','2026-08-31','2026-09-30',NULL,'in_progress',62,3,1),
    ('a5a1a000-0000-4000-8000-000000001612','Core modernization cutover','2026-09-01','2026-11-30',NULL,NULL,'planned',0,3,2),
    ('a5a1a000-0000-4000-8000-000000001613','MVP release','2026-03-01','2026-05-15',NULL,'2026-05-12','done',100,2,0),
    ('a5a1a000-0000-4000-8000-000000001613','AI deflection live','2026-05-16','2026-06-30','2026-07-20',NULL,'in_progress',70,2,1),
    ('a5a1a000-0000-4000-8000-000000001613','Full migration','2026-07-01','2026-08-31','2026-09-20',NULL,'planned',10,2,2),
    ('a5a1a000-0000-4000-8000-000000001614','Desk staffed & SLAs live','2026-04-01','2026-06-30','2026-07-10',NULL,'in_progress',80,1,0);

  INSERT INTO public.strata_dependencies (requesting_type, requesting_id, serving_type, serving_id, serving_label, dependency_type, due_date, status, sla_days, impact, is_blocker) VALUES
    ('project_card','a5a1a000-0000-4000-8000-000000001613','project_card','a5a1a000-0000-4000-8000-000000001611',NULL,'delivery','2026-07-15','at_risk',14,'Care app enterprise flows need CPQ catalogue API.',false),
    ('project_card','a5a1a000-0000-4000-8000-000000001612','external',NULL,'Municipal permits authority','external','2026-07-31','blocked',30,'Permits pending for 40 wave-2 sites.',true);

  -- ── Portfolio / VMO ────────────────────────────────────────────────────
  INSERT INTO public.strata_portfolios (id, name, slug, description, category_id, value_target, status) VALUES
    ('a5a1a000-0000-4000-8000-000000001701','Transformation Portfolio FY2026','transformation-portfolio-fy2026','DEMO SEED (Salam reference tenant) — enterprise transformation investments','a5a1a000-0000-4000-8000-000000000301',120000000,'active');
  INSERT INTO public.strata_portfolio_memberships (portfolio_id, member_type, member_id, allocation_pct, priority) VALUES
    ('a5a1a000-0000-4000-8000-000000001701','initiative','a5a1a000-0000-4000-8000-000000001601',100,1),
    ('a5a1a000-0000-4000-8000-000000001701','initiative','a5a1a000-0000-4000-8000-000000001602',100,2),
    ('a5a1a000-0000-4000-8000-000000001701','initiative','a5a1a000-0000-4000-8000-000000001603',100,3);

  INSERT INTO public.strata_benefits (id, name, slug, description, category_id, portfolio_id, unit, lifecycle_stage, value_hypothesis, causal_mechanism, confidence) VALUES
    ('a5a1a000-0000-4000-8000-000000001801','B2B Revenue Uplift','b2b-revenue-uplift','Incremental B2B revenue from solution selling','a5a1a000-0000-4000-8000-000000000301','a5a1a000-0000-4000-8000-000000001701','SAR','in_flight','Solution selling raises average deal size 15%.','Larger multi-product deals + faster quote turnaround.',0.8),
    ('a5a1a000-0000-4000-8000-000000001802','Cost-to-Serve Reduction','cost-to-serve-reduction','Care deflection to digital channels','a5a1a000-0000-4000-8000-000000000302','a5a1a000-0000-4000-8000-000000001701','SAR','finance_validated','Digital care deflects 30% of assisted contacts.','Self-service + AI deflection reduce assisted volume.',0.85),
    ('a5a1a000-0000-4000-8000-000000001803','Churn Reduction Value','churn-reduction-value','Retained revenue from churn improvement','a5a1a000-0000-4000-8000-000000000303','a5a1a000-0000-4000-8000-000000001701','SAR','in_flight','Network quality + care lift retention 0.5pp.','Fewer quality-driven detractors; proactive care.',0.6);

  INSERT INTO public.strata_benefit_initiatives (benefit_id, initiative_id, attribution_share) VALUES
    ('a5a1a000-0000-4000-8000-000000001801','a5a1a000-0000-4000-8000-000000001601',100),
    ('a5a1a000-0000-4000-8000-000000001802','a5a1a000-0000-4000-8000-000000001603',70),
    ('a5a1a000-0000-4000-8000-000000001802','a5a1a000-0000-4000-8000-000000001601',30),
    ('a5a1a000-0000-4000-8000-000000001803','a5a1a000-0000-4000-8000-000000001602',60),
    ('a5a1a000-0000-4000-8000-000000001803','a5a1a000-0000-4000-8000-000000001603',40);

  INSERT INTO public.strata_benefit_values (benefit_id, period_id, value_kind, value, validation_status, validated_at) VALUES
    -- B2B Revenue Uplift
    ('a5a1a000-0000-4000-8000-000000001801','a5a1a000-0000-4000-8000-000000001011','planned', 10000000,'validated',now() - interval '80 days'),
    ('a5a1a000-0000-4000-8000-000000001801','a5a1a000-0000-4000-8000-000000001012','planned', 14000000,'validated',now() - interval '80 days'),
    ('a5a1a000-0000-4000-8000-000000001801','a5a1a000-0000-4000-8000-000000001011','realized', 8200000,'validated',now() - interval '70 days'),
    ('a5a1a000-0000-4000-8000-000000001801','a5a1a000-0000-4000-8000-000000001012','realized',12500000,'validated',now() - interval '1 day'),
    ('a5a1a000-0000-4000-8000-000000001801','a5a1a000-0000-4000-8000-000000001012','forecast',13800000,'pending',NULL),
    -- Cost-to-Serve Reduction
    ('a5a1a000-0000-4000-8000-000000001802','a5a1a000-0000-4000-8000-000000001011','planned',  6000000,'validated',now() - interval '80 days'),
    ('a5a1a000-0000-4000-8000-000000001802','a5a1a000-0000-4000-8000-000000001012','planned',  8000000,'validated',now() - interval '80 days'),
    ('a5a1a000-0000-4000-8000-000000001802','a5a1a000-0000-4000-8000-000000001011','realized', 5100000,'validated',now() - interval '70 days'),
    ('a5a1a000-0000-4000-8000-000000001802','a5a1a000-0000-4000-8000-000000001012','realized', 8300000,'validated',now() - interval '1 day'),
    -- Churn Reduction Value
    ('a5a1a000-0000-4000-8000-000000001803','a5a1a000-0000-4000-8000-000000001011','planned',  4000000,'validated',now() - interval '80 days'),
    ('a5a1a000-0000-4000-8000-000000001803','a5a1a000-0000-4000-8000-000000001012','planned',  5000000,'validated',now() - interval '80 days'),
    ('a5a1a000-0000-4000-8000-000000001803','a5a1a000-0000-4000-8000-000000001011','realized', 2900000,'validated',now() - interval '70 days'),
    ('a5a1a000-0000-4000-8000-000000001803','a5a1a000-0000-4000-8000-000000001012','realized', 4200000,'validated',now() - interval '1 day'),
    ('a5a1a000-0000-4000-8000-000000001803','a5a1a000-0000-4000-8000-000000001012','forecast', 4600000,'pending',NULL);

  INSERT INTO public.strata_assumptions (benefit_id, description, confidence, status) VALUES
    ('a5a1a000-0000-4000-8000-000000001801','Enterprise demand holds at FY2025 pipeline levels.',0.8,'holding'),
    ('a5a1a000-0000-4000-8000-000000001801','CPQ rollout completes before Q4 selling season.',0.7,'open'),
    ('a5a1a000-0000-4000-8000-000000001802','AI deflection sustains >25% without CSAT decline.',0.75,'holding'),
    ('a5a1a000-0000-4000-8000-000000001803','No competitor price shock in H2.',0.5,'open');

  INSERT INTO public.strata_attribution_rules (benefit_id, rule_type, definition) VALUES
    ('a5a1a000-0000-4000-8000-000000001802','shared_benefit','{"split":{"digital-care-platform":70,"b2b-sales-transformation":30},"basis":"contact-deflection attribution model v1"}'),
    ('a5a1a000-0000-4000-8000-000000001803','counterfactual','{"bau_churn_pp":2.6,"method":"12-month trailing baseline"}');

  -- ── Gates ──────────────────────────────────────────────────────────────
  INSERT INTO public.strata_gate_instances (id, gate_model_id, stage_id, subject_type, subject_id, scheduled_for, status, verdict, verdict_note, decided_at) VALUES
    ('a5a1a000-0000-4000-8000-000000001851','a5a1a000-0000-4000-8000-000000000401','a5a1a000-0000-4000-8000-000000000412','initiative','a5a1a000-0000-4000-8000-000000001601','2026-02-15','decided','approve','Business case approved with SAR 18M envelope.', '2026-02-15 10:00+03'),
    ('a5a1a000-0000-4000-8000-000000001852','a5a1a000-0000-4000-8000-000000000401','a5a1a000-0000-4000-8000-000000000415','benefit','a5a1a000-0000-4000-8000-000000001803','2026-07-20','open',NULL,NULL,NULL);
  INSERT INTO public.strata_gate_evidence (gate_instance_id, criterion_key, evidence_ref, satisfied) VALUES
    ('a5a1a000-0000-4000-8000-000000001851','value_thesis','{"entity_type":"benefit","entity_id":"a5a1a000-0000-4000-8000-000000001801"}',true),
    ('a5a1a000-0000-4000-8000-000000001851','funding','{"note":"CFO memo 2026-02-10"}',true),
    ('a5a1a000-0000-4000-8000-000000001852','benefit_evidence','{"entity_type":"benefit","entity_id":"a5a1a000-0000-4000-8000-000000001803"}',false);

  -- ── Run the calculation engine (provenance-carrying results) ───────────
  PERFORM public.strata_calc_period('a5a1a000-0000-4000-8000-000000001011');
  PERFORM public.strata_calc_period('a5a1a000-0000-4000-8000-000000001012');
  PERFORM public.strata_calc_execution_progress('a5a1a000-0000-4000-8000-000000001611','a5a1a000-0000-4000-8000-000000000201');
  PERFORM public.strata_calc_execution_progress('a5a1a000-0000-4000-8000-000000001612','a5a1a000-0000-4000-8000-000000000201');
  PERFORM public.strata_calc_execution_progress('a5a1a000-0000-4000-8000-000000001613','a5a1a000-0000-4000-8000-000000000201');
  PERFORM public.strata_calc_execution_progress('a5a1a000-0000-4000-8000-000000001614','a5a1a000-0000-4000-8000-000000000201');
  PERFORM public.strata_calc_benefit_realization('a5a1a000-0000-4000-8000-000000001801');
  PERFORM public.strata_calc_benefit_realization('a5a1a000-0000-4000-8000-000000001802');
  PERFORM public.strata_calc_benefit_realization('a5a1a000-0000-4000-8000-000000001803');
  PERFORM public.strata_calc_value_at_risk('a5a1a000-0000-4000-8000-000000001701');
  PERFORM public.strata_calc_ytd('a5a1a000-0000-4000-8000-000000001201','a5a1a000-0000-4000-8000-000000001001','avg');
  PERFORM public.strata_calc_ytd('a5a1a000-0000-4000-8000-000000001204','a5a1a000-0000-4000-8000-000000001001','last');

  -- ── Q1 executive review: locked snapshot + decision + actions ──────────
  -- (Direct inserts: seeding runs as service role; runtime locking uses strata_lock_snapshot.)
  INSERT INTO public.strata_snapshots (id, snapshot_key, cycle_id, period_id, name, scope, config_versions, data_run_ids, locked_at, status)
  VALUES ('a5a1a000-0000-4000-8000-000000001901','SNAP-1001',
          'a5a1a000-0000-4000-8000-000000001001','a5a1a000-0000-4000-8000-000000001011',
          'Q1 FY2026 Executive Review',
          '{"instance_ids":["a5a1a000-0000-4000-8000-000000001511"]}',
          jsonb_build_object(
            'scorecard_models', jsonb_build_array(jsonb_build_object('id','a5a1a000-0000-4000-8000-000000001501','version',1)),
            'threshold_schemes', jsonb_build_array(jsonb_build_object('id','a5a1a000-0000-4000-8000-000000000201','version',1)),
            'perspectives', (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_perspectives WHERE status = 'approved')
          ),
          '{}', '2026-04-08 09:00+03', 'locked');

  INSERT INTO public.strata_snapshot_items (snapshot_id, entity_type, entity_id, payload)
  SELECT 'a5a1a000-0000-4000-8000-000000001901', cv.entity_type, cv.entity_id, to_jsonb(cv) - 'id' - 'snapshot_id'
    FROM public.strata_calculated_values cv
   WHERE cv.period_id = 'a5a1a000-0000-4000-8000-000000001011'
     AND cv.calculated_at = (SELECT max(cv2.calculated_at) FROM public.strata_calculated_values cv2
                             WHERE cv2.entity_type = cv.entity_type AND cv2.entity_id = cv.entity_id
                               AND cv2.period_id = cv.period_id AND cv2.metric_key = cv.metric_key);

  UPDATE public.strata_calculated_values SET snapshot_id = 'a5a1a000-0000-4000-8000-000000001901'
   WHERE period_id = 'a5a1a000-0000-4000-8000-000000001011' AND snapshot_id IS NULL;
  UPDATE public.strata_scorecard_instances
     SET status = 'locked', locked_snapshot_id = 'a5a1a000-0000-4000-8000-000000001901'
   WHERE id = 'a5a1a000-0000-4000-8000-000000001511';

  INSERT INTO public.strata_decisions (id, decision_key, forum, snapshot_id, decision_type, title, description, decided_at, due_date, status, evidence_refs) VALUES
    ('a5a1a000-0000-4000-8000-000000001902','DEC-1001','Quarterly Business Review','a5a1a000-0000-4000-8000-000000001901','governance',
     'Accelerate digital care deflection','Q1 churn missed target (2.4% vs 2.0%). Pull AI deflection forward one month; VMO to re-baseline churn-value benefit if Q2 misses.',
     '2026-04-08 10:30+03','2026-07-31','decided',
     '[{"entity_type":"kpi","entity_id":"a5a1a000-0000-4000-8000-000000001202"},{"entity_type":"benefit","entity_id":"a5a1a000-0000-4000-8000-000000001803"}]');

  INSERT INTO public.strata_actions (decision_id, title, due_date, status, note) VALUES
    ('a5a1a000-0000-4000-8000-000000001902','Re-plan AI deflection go-live to July 20','2026-07-20','in_progress','Care App v3 milestone updated; permits dependency tracked.'),
    ('a5a1a000-0000-4000-8000-000000001902','Churn root-cause deep dive to Q2 review','2026-06-30','done','Completed; network-quality detractors concentrated in 2 regions.');

  INSERT INTO public.strata_board_packs (snapshot_id, format, status) VALUES
    ('a5a1a000-0000-4000-8000-000000001901','pdf','pending'),
    ('a5a1a000-0000-4000-8000-000000001901','pptx','pending');

  -- ── AI advisory sample (advisory-only, provenance-carrying) ────────────
  INSERT INTO public.strata_ai_outputs (use_case, entity_refs, snapshot_id, config_context, uses_live_data, content, cited_evidence, confidence, model, human_review_status) VALUES
    ('variance_explanation',
     '[{"entity_type":"kpi","entity_id":"a5a1a000-0000-4000-8000-000000001202"}]',
     'a5a1a000-0000-4000-8000-000000001901',
     '{"threshold_scheme_id":"a5a1a000-0000-4000-8000-000000000201","formula_version":"v1"}',
     false,
     'ADVISORY (draft — requires human review): Q1 churn landed at 2.4% against a 2.0% target. The linked evidence points to quality-driven detractors concentrated in two regions where 5G Wave-2 permits are blocked, alongside assisted-care wait times prior to the Care App v3 MVP. The approved mitigation (accelerated AI deflection, DEC-1001) is consistent with the Q2 improvement to 1.9%.',
     '[{"entity_type":"decision","entity_id":"a5a1a000-0000-4000-8000-000000001902"},{"entity_type":"dependency","note":"municipal permits blocker"}]',
     0.72,'claude-fable-5','pending');

  RAISE NOTICE 'STRATA demo seed complete (Salam reference tenant).';
END
$seed$;
