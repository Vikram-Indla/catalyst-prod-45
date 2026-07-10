-- CAT-STRATA-CONSOLIDATE-20260710-001 · Catalyst-context seed (user-directed)
-- Seeds an "Investor Experience Leadership" strategy pillar into the FY2026 demo
-- cycle, derived 1:1 from the 8 live Catalyst projects on this environment
-- (Investor Journey Product, IR Platform, MIM Website Revamp, ICP Project,
--  Inspection Project, IP Implementation, Tahommena, Senaei BAU).
-- Purpose: exercise the FULL canonical chain with realistic scenario data —
--   Cycle → Theme → Sub-theme → Strategic Objective → OKR → Key Results
--   → Project Cards (Catalyst-referenced) → Milestones / Dependencies / Blockers
--   → Portfolio membership → Benefits → Benefit values (baseline/planned/forecast/realized,
--     incl. one finance-validated value).
-- Notably fills strata_okrs / strata_key_results, which were EMPTY before this seed.
-- Idempotent: fixed UUIDs (prefix a5a1a000-0010-…) + ON CONFLICT DO NOTHING; skips if
-- the FY2026 demo cycle is absent. Staging-only data manipulation approved by Vikram
-- 2026-07-10 ("do not be too safe about the data").

DO $seed$
DECLARE
  cyc uuid := 'a5a1a000-0000-4000-8000-000000001001'; -- FY2026 (active)
  q1  uuid := 'a5a1a000-0000-4000-8000-000000001011';
  q2  uuid := 'a5a1a000-0000-4000-8000-000000001012';
  q3  uuid := 'a5a1a000-0000-4000-8000-000000001013';

  own_a uuid; own_b uuid;

  -- elements
  pillar uuid := 'a5a1a000-0010-4000-8000-000000010001'; -- root theme
  th_a   uuid := 'a5a1a000-0010-4000-8000-000000010002'; -- Investor Journey Transformation
  th_b   uuid := 'a5a1a000-0010-4000-8000-000000010003'; -- Investment Operations Excellence
  obj_a1 uuid := 'a5a1a000-0010-4000-8000-000000010011'; -- strategic objective A
  obj_b1 uuid := 'a5a1a000-0010-4000-8000-000000010012'; -- strategic objective B
  pobj_1 uuid := 'a5a1a000-0010-4000-8000-000000010021'; -- project objective (card 1)

  -- OKR layer
  okr_a uuid := 'a5a1a000-0010-4000-8000-000000010031';
  okr_b uuid := 'a5a1a000-0010-4000-8000-000000010032';

  -- project cards (mapped from Catalyst projects)
  c_ijp uuid := 'a5a1a000-0010-4000-8000-000000010101'; -- Investor Journey Product
  c_irp uuid := 'a5a1a000-0010-4000-8000-000000010102'; -- IR Platform
  c_mim uuid := 'a5a1a000-0010-4000-8000-000000010103'; -- MIM Website Revamp
  c_icp uuid := 'a5a1a000-0010-4000-8000-000000010104'; -- ICP Project
  c_ins uuid := 'a5a1a000-0010-4000-8000-000000010105'; -- Inspection Project
  c_ipi uuid := 'a5a1a000-0010-4000-8000-000000010106'; -- IP Implementation
  c_tah uuid := 'a5a1a000-0010-4000-8000-000000010107'; -- Tahommena
  c_sen uuid := 'a5a1a000-0010-4000-8000-000000010108'; -- Senaei BAU

  pf uuid := 'a5a1a000-0010-4000-8000-000000010201'; -- Investor Experience Portfolio FY2026

  ben1 uuid := 'a5a1a000-0010-4000-8000-000000010301';
  ben2 uuid := 'a5a1a000-0010-4000-8000-000000010302';
  ben3 uuid := 'a5a1a000-0010-4000-8000-000000010303';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = cyc) THEN
    RAISE NOTICE 'FY2026 demo cycle absent — investor pillar seed skipped';
    RETURN;
  END IF;

  SELECT id INTO own_a FROM public.profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO own_b FROM public.profiles ORDER BY created_at OFFSET 1 LIMIT 1;

  ---------------------------------------------------------------------------
  -- 1. Strategy elements: pillar → 2 sub-themes → 2 strategic objectives
  ---------------------------------------------------------------------------
  INSERT INTO public.strata_strategy_elements
    (id, cycle_id, element_type, name, description, owner_id, parent_id, stage, status, order_index, context, map_position, created_by)
  VALUES
    (pillar, cyc, 'theme', 'Investor Experience Leadership',
     'Make the firm the easiest place for investors to onboard, transact and stay informed — the investor-facing counterpart to our operational backbone.',
     own_a, NULL, 'active', 'active', 2, 'theme', '{"x": 640, "y": 80}'::jsonb, own_a),
    (th_a, cyc, 'theme', 'Investor Journey Transformation',
     'Digitize the investor lifecycle end-to-end: acquisition, onboarding, reporting and self-service (Catalyst delivery: Investor Journey Product, IR Platform, MIM Website Revamp).',
     own_a, pillar, 'active', 'active', 0, 'theme', '{"x": 640, "y": 200}'::jsonb, own_a),
    (th_b, cyc, 'theme', 'Investment Operations Excellence',
     'Industrialize core investment operations: inspections, counterparty screening, platform implementations and BAU run (Catalyst delivery: ICP, Inspection, IP Implementation, Tahommena, Senaei BAU).',
     own_b, pillar, 'active', 'active', 1, 'theme', '{"x": 640, "y": 320}'::jsonb, own_a),
    (obj_a1, cyc, 'objective', 'Digitize the End-to-End Investor Journey',
     'A new investor completes onboarding digitally in under 5 days and self-serves reporting through the portal.',
     own_a, th_a, 'active', 'active', 0, 'theme', '{"x": 840, "y": 200}'::jsonb, own_a),
    (obj_b1, cyc, 'objective', 'Industrialize Core Investment Operations',
     'Inspection, screening and implementation work runs on automated, SLA-bound processes instead of manual effort.',
     own_b, th_b, 'active', 'active', 0, 'theme', '{"x": 840, "y": 320}'::jsonb, own_a)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------------
  -- 2. OKR layer (was EMPTY before this seed) + Key Results
  ---------------------------------------------------------------------------
  INSERT INTO public.strata_okrs
    (id, objective_element_id, name, owner_id, cycle_id, period_id, confidence, status, created_by)
  VALUES
    (okr_a, obj_a1, 'Investor Digital Adoption FY2026', own_a, cyc, q2, 0.70, 'active', own_a),
    (okr_b, obj_b1, 'Operational Efficiency FY2026',    own_b, cyc, q2, 0.55, 'active', own_a)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.strata_key_results
    (id, okr_id, name, unit, baseline, target, current_value, direction, status, order_index)
  VALUES
    ('a5a1a000-0010-4000-8000-000000010041', okr_a, 'Digital onboarding completion rate', '%',     22,   75,   48,   'higher_better', 'active', 0),
    ('a5a1a000-0010-4000-8000-000000010042', okr_a, 'Investor portal monthly active users', 'users', 1200, 5000, 2600, 'higher_better', 'active', 1),
    ('a5a1a000-0010-4000-8000-000000010043', okr_a, 'Average onboarding cycle time', 'days',        14,   5,    9,    'lower_better',  'active', 2),
    ('a5a1a000-0010-4000-8000-000000010044', okr_b, 'Inspection turnaround time', 'days',           21,   7,    15,   'lower_better',  'active', 0),
    ('a5a1a000-0010-4000-8000-000000010045', okr_b, 'Ops process automation coverage', '%',         10,   60,   25,   'higher_better', 'active', 1)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------------
  -- 3. Project Cards — one per live Catalyst project (reference_id = Catalyst project uuid)
  ---------------------------------------------------------------------------
  INSERT INTO public.strata_project_cards
    (id, name, source_system, reference_id, sync_metadata, pm_id, budget,
     baseline_start, baseline_end, forecast_end, actual_progress, execution_health,
     stage, card_type, theme_id, objective_element_id, scope_description, optional_fields, created_by)
  VALUES
    (c_ijp, 'Investor Journey Product', 'manual', '7c642e30-0c70-435d-9510-cd7c8ad79e02',
     '{"catalyst_project":"Investor Journey Product"}'::jsonb, own_a, 850000,
     '2026-01-15', '2026-10-30', '2026-10-30', 45, 'on_track',
     'active', 'standard', th_a, obj_a1,
     'Unified digital onboarding and investor self-service product.', '{}'::jsonb, own_a),
    (c_irp, 'IR Platform', 'manual', '0c064f9e-38e0-48b4-ab6c-ddea9216ea57',
     '{"catalyst_project":"IR Platform"}'::jsonb, own_a, 1200000,
     '2026-02-01', '2026-09-30', '2026-11-15', 60, 'minor_delay',
     'active', 'standard', th_a, obj_a1,
     'Investor-relations platform: reporting, communications, disclosures.', '{}'::jsonb, own_a),
    (c_mim, 'MIM Website Revamp', 'manual', 'a1626a28-21ee-4f4f-9e6d-7b1bbbdbb238',
     '{"catalyst_project":"MIM Website Revamp"}'::jsonb, own_b, 400000,
     '2026-03-01', '2026-08-31', '2026-08-31', 30, 'on_track',
     'active', 'standard', th_a, obj_a1,
     'Public web presence revamp feeding the digital acquisition funnel.', '{}'::jsonb, own_a),
    (c_icp, 'ICP Project', 'manual', '48528158-3656-4533-b534-dd0f74909a7d',
     '{"catalyst_project":"ICP Project"}'::jsonb, own_b, 600000,
     '2026-01-10', '2026-07-31', '2026-07-31', 55, 'on_track',
     'active', 'standard', th_b, obj_b1,
     'Investor counterparty profiling and screening automation.', '{}'::jsonb, own_a),
    (c_ins, 'Inspection Project', 'manual', '31c88baf-cd3c-4751-9c79-03f35aadb2e4',
     '{"catalyst_project":"Inspection Project"}'::jsonb, own_b, 350000,
     '2026-02-15', '2026-06-30', '2026-09-30', 20, 'major_delay',
     'active', 'standard', th_b, obj_b1,
     'Field inspection digitization: scheduling, evidence capture, SLA tracking.', '{}'::jsonb, own_a),
    (c_ipi, 'IP Implementation', 'manual', '45841fe1-e5f2-41f6-846a-256734b472eb',
     '{"catalyst_project":"IP Implementation"}'::jsonb, own_a, 500000,
     '2026-01-20', '2026-08-15', '2026-09-05', 40, 'minor_delay',
     'active', 'standard', th_b, obj_b1,
     'Investment platform implementation and data migration.', '{}'::jsonb, own_a),
    (c_tah, 'Tahommena', 'manual', '73990779-a771-479e-a3e5-277d73b810cd',
     '{"catalyst_project":"Tahommena"}'::jsonb, own_b, 300000,
     '2026-05-01', '2026-12-15', '2026-12-15', 0, 'not_started',
     'active', 'standard', th_b, obj_b1,
     'Tahommena programme mobilization.', '{}'::jsonb, own_a),
    (c_sen, 'Senaei BAU', 'manual', '85778434-39a6-4ed2-b550-a03ebfe2fbd4',
     '{"catalyst_project":"Senaei BAU"}'::jsonb, own_a, 200000,
     '2026-01-01', '2026-12-31', '2026-12-31', 70, 'on_track',
     'active', 'standard', th_b, obj_b1,
     'Business-as-usual run and minor enhancements for Senaei.', '{}'::jsonb, own_a)
  ON CONFLICT (id) DO NOTHING;

  -- Project objective on the flagship card's chain (context='project', links back to strategic objective)
  INSERT INTO public.strata_strategy_elements
    (id, cycle_id, element_type, name, description, owner_id, parent_id, stage, status, order_index, context, created_by)
  VALUES
    (pobj_1, cyc, 'objective', 'Launch unified investor onboarding',
     'Project objective of Investor Journey Product; rolls up to "Digitize the End-to-End Investor Journey".',
     own_a, obj_a1, 'active', 'active', 0, 'project', own_a)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------------
  -- 4. Milestones + dependencies (incl. blockers) on the interesting cards
  ---------------------------------------------------------------------------
  INSERT INTO public.strata_milestones
    (id, project_card_id, name, owner_id, baseline_start, baseline_end, forecast_date, actual_date, status, progress, weight, order_index)
  VALUES
    ('a5a1a000-0010-4000-8000-000000010401', c_ijp, 'Discovery & investor journey mapping', own_a, '2026-01-15', '2026-03-01', NULL, '2026-02-26', 'done',        100, 1, 0),
    ('a5a1a000-0010-4000-8000-000000010402', c_ijp, 'Onboarding MVP live (friends & family)', own_a, '2026-03-02', '2026-07-15', '2026-07-15', NULL, 'in_progress', 55,  2, 1),
    ('a5a1a000-0010-4000-8000-000000010403', c_ijp, 'General availability + portal self-service', own_a, '2026-07-16', '2026-10-30', '2026-10-30', NULL, 'planned',   0,   2, 2),
    ('a5a1a000-0010-4000-8000-000000010404', c_irp, 'Disclosure engine data model', own_a, '2026-02-01', '2026-04-30', NULL, '2026-05-20', 'done',        100, 1, 0),
    ('a5a1a000-0010-4000-8000-000000010405', c_irp, 'Quarterly reporting pack automation', own_a, '2026-05-01', '2026-08-15', '2026-09-30', NULL, 'missed',     35,  2, 1),
    ('a5a1a000-0010-4000-8000-000000010406', c_ins, 'Mobile evidence-capture pilot', own_b, '2026-02-15', '2026-04-30', '2026-08-15', NULL, 'missed',      25,  1, 0)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.strata_dependencies
    (id, requesting_type, requesting_id, serving_type, serving_id, serving_label, dependency_type, due_date, status, is_blocker, impact, description, owner_id, name, created_by)
  VALUES
    ('a5a1a000-0010-4000-8000-000000010501', 'project_card', c_irp, 'project_card', c_ijp, NULL,
     'delivery', '2026-08-01', 'at_risk', false, 'Reporting pack needs onboarding identity model',
     'IR Platform consumes the investor identity model delivered by Investor Journey Product.', own_a,
     'Investor identity model handoff', own_a),
    ('a5a1a000-0010-4000-8000-000000010502', 'project_card', c_ins, 'external', NULL, 'Regulator field-audit API',
     'external', '2026-07-15', 'blocked', true, 'Cannot certify inspections without regulator API access',
     'Regulator has not yet granted sandbox access for the field-audit submission API.', own_b,
     'Regulator API access', own_a),
    ('a5a1a000-0010-4000-8000-000000010503', 'project_card', c_ipi, 'project_card', c_icp, NULL,
     'data', '2026-06-30', 'open', false, 'Migration needs cleansed counterparty master',
     'IP Implementation migration depends on the ICP cleansed counterparty dataset.', own_b,
     'Counterparty master data feed', own_a)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------------
  -- 5. Portfolio + memberships (only project_cards may join — rules 12–15)
  ---------------------------------------------------------------------------
  INSERT INTO public.strata_portfolios (id, name, slug, description, owner_id, created_by)
  VALUES (pf, 'Investor Experience Portfolio FY2026', 'investor-experience-portfolio-fy2026',
          'Value stream covering investor-facing digitization and the operations backbone that serves it (seeded from live Catalyst projects).',
          own_a, own_a)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.strata_portfolio_memberships (id, portfolio_id, member_type, member_id, allocation_pct, priority)
  VALUES
    ('a5a1a000-0010-4000-8000-000000010601', pf, 'project_card', c_ijp, 100, 1),
    ('a5a1a000-0010-4000-8000-000000010602', pf, 'project_card', c_irp, 100, 2),
    ('a5a1a000-0010-4000-8000-000000010603', pf, 'project_card', c_mim, 100, 3),
    ('a5a1a000-0010-4000-8000-000000010604', pf, 'project_card', c_icp, 100, 4),
    ('a5a1a000-0010-4000-8000-000000010605', pf, 'project_card', c_ins, 100, 5),
    ('a5a1a000-0010-4000-8000-000000010606', pf, 'project_card', c_ipi, 100, 6),
    ('a5a1a000-0010-4000-8000-000000010607', pf, 'project_card', c_tah, 100, 7),
    ('a5a1a000-0010-4000-8000-000000010608', pf, 'project_card', c_sen, 100, 8)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------------
  -- 6. Benefits + values (baseline/planned/forecast/realized; one finance-validated)
  ---------------------------------------------------------------------------
  INSERT INTO public.strata_benefits
    (id, name, slug, description, portfolio_id, owner_id, validator_id, unit, lifecycle_stage, value_hypothesis, confidence, created_by)
  VALUES
    (ben1, 'AUM growth from digital investor acquisition', 'aum-growth-digital-acquisition',
     'Net-new assets under management attributable to the digital onboarding funnel.',
     pf, own_a, own_b, 'USD', 'in_flight',
     'Faster, self-service onboarding converts more qualified investors and reduces drop-off.', 0.7, own_a),
    (ben2, 'Operations cost reduction from automation', 'ops-cost-reduction-automation',
     'Run-cost reduction from automating screening, inspection and reporting processes.',
     pf, own_b, own_a, 'USD', 'baselined',
     'Automation coverage of 60% removes manual effort across ops teams.', 0.6, own_a),
    (ben3, 'Regulatory penalty avoidance (inspection SLA)', 'regulatory-penalty-avoidance',
     'Avoided penalties by meeting the regulator inspection SLA consistently.',
     pf, own_b, own_a, 'USD', 'qualified',
     'Digitized inspections keep turnaround inside the regulated SLA window.', 0.5, own_a)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.strata_benefit_values
    (id, benefit_id, period_id, value_kind, value, submitted_by, validation_status, validated_by, validated_at, validation_note)
  VALUES
    ('a5a1a000-0010-4000-8000-000000010701', ben1, q1, 'baseline',  0,       own_a, 'pending',   NULL,  NULL, NULL),
    ('a5a1a000-0010-4000-8000-000000010702', ben1, q2, 'planned',   2000000, own_a, 'pending',   NULL,  NULL, NULL),
    ('a5a1a000-0010-4000-8000-000000010703', ben1, q2, 'forecast',  1600000, own_a, 'pending',   NULL,  NULL, NULL),
    ('a5a1a000-0010-4000-8000-000000010704', ben1, q2, 'realized',  450000,  own_a, 'validated', own_b, now(), 'Finance-validated against Q2 inflow report.'),
    ('a5a1a000-0010-4000-8000-000000010705', ben2, q2, 'planned',   800000,  own_b, 'pending',   NULL,  NULL, NULL),
    ('a5a1a000-0010-4000-8000-000000010706', ben2, q2, 'forecast',  750000,  own_b, 'pending',   NULL,  NULL, NULL),
    ('a5a1a000-0010-4000-8000-000000010707', ben2, q2, 'realized',  120000,  own_b, 'pending',   NULL,  NULL, NULL),
    ('a5a1a000-0010-4000-8000-000000010708', ben3, q3, 'planned',   300000,  own_b, 'pending',   NULL,  NULL, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Benefit ↔ Project Card attribution (only cards attribute value — rule 15)
  INSERT INTO public.strata_benefit_project_cards (id, benefit_id, project_card_id, attribution_share)
  VALUES
    ('a5a1a000-0010-4000-8000-000000010801', ben1, c_ijp, 0.6),
    ('a5a1a000-0010-4000-8000-000000010802', ben1, c_irp, 0.4),
    ('a5a1a000-0010-4000-8000-000000010803', ben2, c_icp, 0.5),
    ('a5a1a000-0010-4000-8000-000000010804', ben2, c_ipi, 0.5),
    ('a5a1a000-0010-4000-8000-000000010805', ben3, c_ins, 1.0)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Investor pillar seed complete: 1 pillar, 2 sub-themes, 2 strategic + 1 project objective, 2 OKRs, 5 KRs, 8 Catalyst-referenced cards, 6 milestones, 3 dependencies (1 blocker), 1 portfolio, 8 memberships, 3 benefits, 8 values, 5 attributions';
END $seed$;
