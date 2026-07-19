-- CAT-STRATA-THEMEOKR-20260719-001 — Wave 1: shared registries + governed roles.
--
-- Theme-owned OKR capability, foundation layer. Additive only. Introduces two shared
-- platform registries the Key Result contract depends on (owning organisation unit,
-- governed unit-of-measure) and extends the STRATA role vocabulary with the OKR/KR
-- responsibility roles (decision D-2: add new roles, additive-only — the existing six
-- roles are preserved).
--
-- Nothing here touches OKR/KR business data. No existing table is dropped or rewritten.
-- Reuses the canonical STRATA trigger helpers (strata_generate_slug / strata_touch_updated_at /
-- strata_audit) and the canonical RLS predicates (current_user_is_approved / strata_has_role).

-- ---------------------------------------------------------------------------
-- 1. Governed role vocabulary — add OKR/KR responsibility roles (additive).
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_role_assignments
  DROP CONSTRAINT IF EXISTS strata_role_assignments_role_check;
ALTER TABLE public.strata_role_assignments
  ADD CONSTRAINT strata_role_assignments_role_check CHECK (
    role = ANY (ARRAY[
      'strata_admin','strategy_office','executive_viewer','kpi_owner','vmo_validator','data_steward',
      -- Theme-owned OKR roles (CAT-STRATA-THEMEOKR-20260719-001):
      'okr_owner','kr_owner','kr_reporter','okr_approver'
    ]::text[])
  );

-- ---------------------------------------------------------------------------
-- 2. Owning organisation unit registry (shared platform service).
--    OKR and KR each carry exactly one owning organisation (invariant 7).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  parent_id uuid REFERENCES public.strata_org_units(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_org_units IS
  'Governed owning-organisation-unit registry for Theme-owned OKR/KR accountability (CAT-STRATA-THEMEOKR-20260719-001, invariant 7). Shared platform service; does not merge with any business identity.';

-- ---------------------------------------------------------------------------
-- 3. Governed unit-of-measure registry (shared platform service, decision D-3).
--    KR "unit and scale" resolve to a governed taxonomy rather than free text.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text,
  category text NOT NULL CHECK (category IN
    ('percentage','count','currency','duration','ratio','rate','score','index','other')),
  scale text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_units_of_measure IS
  'Governed unit-of-measure registry (CAT-STRATA-THEMEOKR-20260719-001, D-3). Referenced (optionally, validated on submit/approve) by Key Result measurement contracts. Not a KPI/benefit identity.';

INSERT INTO public.strata_units_of_measure (code, name, symbol, category, scale) VALUES
  ('percent',      'Percent',              '%',   'percentage', '0-100'),
  ('ratio',        'Ratio',                NULL,  'ratio',      '0-1'),
  ('count',        'Count',                '#',   'count',      'integer'),
  ('users',        'Users',                NULL,  'count',      'integer'),
  ('days',         'Days',                 'd',   'duration',   'days'),
  ('hours',        'Hours',                'h',   'duration',   'hours'),
  ('months',       'Months',               'mo',  'duration',   'months'),
  ('currency_usd', 'US Dollars',           '$',   'currency',   'USD'),
  ('currency_gbp', 'Pounds Sterling',      '£',   'currency',   'GBP'),
  ('currency_eur', 'Euros',                '€',   'currency',   'EUR'),
  ('per_1000',     'Per thousand',         '‰',   'rate',       'per-1000'),
  ('nps',          'Net Promoter Score',   NULL,  'score',      '-100..100'),
  ('index',        'Index',                NULL,  'index',      'index-100'),
  ('score_10',     'Score (0-10)',         NULL,  'score',      '0-10')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Triggers — reuse canonical STRATA helpers.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- slug only where the table carries name+slug
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_org_units_slug') THEN
    CREATE TRIGGER trg_strata_org_units_slug BEFORE INSERT ON public.strata_org_units
      FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_org_units_touch') THEN
    CREATE TRIGGER trg_strata_org_units_touch BEFORE UPDATE ON public.strata_org_units
      FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_org_units_audit') THEN
    CREATE TRIGGER trg_strata_org_units_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_org_units
      FOR EACH ROW EXECUTE FUNCTION public.strata_audit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_units_of_measure_touch') THEN
    CREATE TRIGGER trg_strata_units_of_measure_touch BEFORE UPDATE ON public.strata_units_of_measure
      FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_units_of_measure_audit') THEN
    CREATE TRIGGER trg_strata_units_of_measure_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_units_of_measure
      FOR EACH ROW EXECUTE FUNCTION public.strata_audit();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. RLS — approved users read; strategy_office/admin write org units;
--    admin-only writes to the unit registry (reference data).
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_org_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_org_units_select ON public.strata_org_units FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_org_units_write ON public.strata_org_units FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office','strata_admin']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','strata_admin']));

ALTER TABLE public.strata_units_of_measure ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_units_of_measure_select ON public.strata_units_of_measure FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_units_of_measure_write ON public.strata_units_of_measure FOR ALL
  USING (public.strata_is_admin())
  WITH CHECK (public.strata_is_admin());
