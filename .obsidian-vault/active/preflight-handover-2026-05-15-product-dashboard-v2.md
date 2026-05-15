# Preflight handover — Product Dashboard v2 (post-feedback rebuild) — 2026-05-15

## Context
- **Surface:** cross-cutting (dashboard + side-drawer + AI feature + admin schema + multi-tenant productization)
- **Tier:** high-stake
- **Started:** 2026-05-15
- **Council ran:** yes — full 17-advisor (Design Foundation 7 + Atlassian Architect 5 + Engineering 5)
- **PR:** pending (rows not yet committed)
- **Sessions to ship:** ~10–11

## Decisions locked
1. **All 6 widgets configurable in v1** — each rebuild ships with its settings panel.
2. **Stage Drill-Down Drawer** ships ALL 4 unique features: inline AI summary per BR · BR→Epic→Story→Incident colour tree · stage handoff SLA timeline · owner accountability footer.
3. **AI Post-Mortem v1** = 5 sections (Lifecycle · Children · Incidents · Timeline · Where We Stand) · markdown bulleted · reuses `ai-improve-story` gateway with new `improve_type='br_postmortem'`.
4. **Skip HTML v2** — go straight to React on localhost:8080. Mockup at `/Users/vikramindla/Downloads/product-dashboard.html` is reference only; the real implementation will be visibly different and ADS-correct.

## Phase 0.5 — Jira Architect Register (8 P0 halts to address in plan)
- A1 Hardcoded hex (mockup) → Use `token('color.…')` in real impl
- A2 `@atlaskit/popup` empty-portal → Use `createPortal` pattern for drawer/modal
- A3 Type icons → `JiraIssueTypeIcon` in drawer tree
- A4 Hand-rolled menu → `@atlaskit/dropdown-menu` for filters
- A6 react-select direct → `@atlaskit/select` only
- A8 Custom font → System stack only
- A11 Hardcoded 11 stages → `useDemandProcessSteps()` data-driven
- A12 Hardcoded role labels → `useDashboardWorkloadRoles()` from admin
- A13 Hardcoded user names → profile data only
- W3 RLS cascade → `user_widget_settings` needs cascade rule

## Plan (8 groups · 34 rows)

### Group 1 — Schema foundation (5 rows · 1 session)
- SQL: extend `demand_process_steps` (is_landing, is_business_owned, is_it_owned)
- SQL: extend `product_roles` (is_workload_relevant)
- SQL: create `user_widget_settings` table (per-user · RLS owner-only)
- SQL: create `dashboard_widget_defaults` table (tenant-wide · RLS admin-write)
- Failing test: schema migration

### Group 2 — Hooks layer (5 rows · 1 session)
- `useWidgetSettings(widgetId)` — per-user with tenant fallback
- `useDashboardWorkloadRoles()` — dynamic role labels
- `useBrCycleTime({startStep, endStep})` — configurable cycle math
- `useBrLandingStep()` — configurable Definition of Done

### Group 3 — Header + workflow path strip (3 rows · ½ session)
- `<DashboardWorkflowPath />` — thin horizontal stepper, data-driven
- Replace filter pills with `@atlaskit/dropdown-menu`

### Group 4 — Widget 1 At-a-glance + settings (4 rows · 1 session)
- 4 KPIs: Active count (excludes Funnel) · Business cycle · IT cycle · Total cycle
- Trend sparkline per cycle leg
- Gear icon → settings panel (which steps are Business / IT / Landing)

### Group 5 — Widget 2 Where is everything sitting + Drawer (5 rows · 3 sessions)
- Stage cards with 12-week sparkline per stage
- `<StageDrillDownDrawer />` with all 4 unique features:
  - Inline AI summary per BR
  - BR→Epic→Story→Incident colour tree
  - Stage handoff SLA timeline
  - Owner accountability footer

### Group 6 — Widgets 3, 4, 6 + each with settings (3 rows · 1.5 sessions)
- Widget 3 Needs your attention: "X days late vs target date YYYY-MM-DD" + "Stuck in: stage" + "Assigned to: person"
- Widget 4 Active interventions: ADS-correct rebuild (already user-approved as concept)
- Widget 6 Who's carrying what: dynamic role labels from `useDashboardWorkloadRoles()`

### Group 7 — AI Post-Mortem (5 rows · 1.5 sessions)
- Edge function: extend `ai-improve-story` with `improve_type='br_postmortem'`
- `<BrPostMortemModal />` with 5 sections, bulleted markdown via `EpicDescriptionEditor` read-only
- 3 entry points: BR detail header · Drawer per-BR row · Recent Releases row

### Group 8 — Widget 5 + Wrap-up (4 rows · 1 session)
- Widget 5 Recent releases — driven by `useBrLandingStep()` (configurable Definition of Done)
- Phase 5 visual evidence (annotated screenshots, design-critique, ads-validator)
- Phase 6 lesson capture (3 new patterns to draft)
- Phase 7 handover continuation

## Files that will be touched (estimated)
**New files (~12):**
- `src/hooks/useWidgetSettings.ts`
- `src/hooks/useDashboardWorkloadRoles.ts`
- `src/hooks/useBrCycleTime.ts`
- `src/hooks/useBrLandingStep.ts`
- `src/components/product-dashboard/DashboardWorkflowPath.tsx`
- `src/components/product-dashboard/widgets/AtAGlanceWidget.tsx`
- `src/components/product-dashboard/widgets/StageOverviewWidget.tsx`
- `src/components/product-dashboard/widgets/StageDrillDownDrawer.tsx`
- `src/components/product-dashboard/widgets/NeedsAttentionWidget.tsx`
- `src/components/product-dashboard/widgets/ActiveInterventionsWidget.tsx`
- `src/components/product-dashboard/widgets/RecentReleasesWidget.tsx`
- `src/components/product-dashboard/widgets/WhoCarriesWhatWidget.tsx`
- `src/components/product-dashboard/widgets/WidgetSettingsPanel.tsx`
- `src/components/product-dashboard/BrPostMortemModal.tsx`
- `supabase/functions/ai-improve-story/index.ts` (extend)

**Migrations (4):**
- `extend_demand_process_steps_landing_business_it.sql`
- `extend_product_roles_workload_relevant.sql`
- `create_user_widget_settings.sql`
- `create_dashboard_widget_defaults.sql`

## Tests to be added
~15 Vitest specs · 1 per hook + 1 per widget + 1 per modal/drawer + 1 schema migration

## Visual evidence (planned for Phase 5)
- Each widget: before/after annotated screenshot
- Drawer: 4-feature demo screenshot
- Post-Mortem: modal screenshot with sample BR
- Workflow path strip: rendered with 9 / 11 / 13 configured stages
- design-critique target ≥ 22/30
- ads-validator target 0 violations

## Open items / next session
- **Start with Group 1 (schema SQL)** — Vikram pastes the 4 SQL blocks below in Lovable, in order
- **Confirm BR → child Epic links** exist in `business_request_links` table or need new wiring (Path B from prior preflight)
- **Confirm Production Incident `parent_key`** chain is consistent for the 5 BRs we'll demo against
- Decide: workflow path strip placement — under page header or above Widget 1?

---

## 🛠️ Group 1 SQL — paste in Lovable in order

### SQL Block 1 of 4 — Extend `demand_process_steps`

```sql
-- Adds 3 columns: is_landing (Definition of Done config), is_business_owned (Demand leg),
-- is_it_owned (Delivery leg). Backfills based on existing sort_order assuming the
-- canonical 11-stage Senaei layout (1-5 Business, 6 handoff/both, 7-11 IT, last = Done).
-- If your stage count is not 11, the backfill UPDATEs are still safe — they just touch
-- whichever rows match those sort_order ranges.

ALTER TABLE public.demand_process_steps
ADD COLUMN IF NOT EXISTS is_landing boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_business_owned boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_it_owned boolean NOT NULL DEFAULT false;

-- Backfill phase ownership (Senaei 11-stage layout).
UPDATE public.demand_process_steps
SET is_business_owned = true, is_it_owned = false
WHERE sort_order BETWEEN 1 AND 5;

UPDATE public.demand_process_steps
SET is_business_owned = true, is_it_owned = true
WHERE sort_order = 6;

UPDATE public.demand_process_steps
SET is_business_owned = false, is_it_owned = true
WHERE sort_order BETWEEN 7 AND 99;  -- handles 9-stage, 11-stage, or 13-stage configs

-- Mark the final active stage as the default landing stage. Admin can change later via /admin/workflows.
UPDATE public.demand_process_steps
SET is_landing = true
WHERE id = (
  SELECT id FROM public.demand_process_steps
  WHERE is_active = true
  ORDER BY sort_order DESC
  LIMIT 1
);

-- Verify
SELECT value, label, sort_order, is_business_owned, is_it_owned, is_landing
FROM public.demand_process_steps
WHERE is_active = true
ORDER BY sort_order;
```

### SQL Block 2 of 4 — Extend `product_roles`

```sql
-- Adds is_workload_relevant flag so the "Who's carrying what" widget pulls roles
-- dynamically from the admin role config (no hardcoded "Delivery Manager" / "Product Owner").

ALTER TABLE public.product_roles
ADD COLUMN IF NOT EXISTS is_workload_relevant boolean NOT NULL DEFAULT false;

-- Backfill: flag the roles that should appear in the workload widget.
-- Adjust role codes if your tenant uses different codes.
UPDATE public.product_roles
SET is_workload_relevant = true
WHERE code IN ('delivery_manager', 'product_owner', 'product_manager', 'super_admin');

-- Verify
SELECT code, name, is_workload_relevant
FROM public.product_roles
ORDER BY is_workload_relevant DESC, code;
```

### SQL Block 3 of 4 — Create `user_widget_settings`

```sql
-- Per-user gear-icon widget config. Persists across sessions.
-- RLS: each user can only see/modify their own settings.

CREATE TABLE IF NOT EXISTS public.user_widget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_id text NOT NULL,                  -- e.g. 'product-dashboard'
  widget_id text NOT NULL,                     -- e.g. 'at-a-glance', 'recent-releases'
  config jsonb NOT NULL DEFAULT '{}'::jsonb,   -- widget-specific shape
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dashboard_id, widget_id)
);

CREATE INDEX IF NOT EXISTS idx_uws_user_dashboard
  ON public.user_widget_settings(user_id, dashboard_id);

-- updated_at auto-touch trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS uws_touch_updated_at ON public.user_widget_settings;
CREATE TRIGGER uws_touch_updated_at
  BEFORE UPDATE ON public.user_widget_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: owner-only
ALTER TABLE public.user_widget_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uws_owner_select ON public.user_widget_settings;
CREATE POLICY uws_owner_select ON public.user_widget_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS uws_owner_insert ON public.user_widget_settings;
CREATE POLICY uws_owner_insert ON public.user_widget_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS uws_owner_update ON public.user_widget_settings;
CREATE POLICY uws_owner_update ON public.user_widget_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS uws_owner_delete ON public.user_widget_settings;
CREATE POLICY uws_owner_delete ON public.user_widget_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_widget_settings';
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_widget_settings';
```

### SQL Block 4 of 4 — Create `dashboard_widget_defaults`

```sql
-- Tenant-wide widget defaults. Admins set these; users get them as fallback when
-- they have no per-user override in user_widget_settings.

CREATE TABLE IF NOT EXISTS public.dashboard_widget_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id text NOT NULL,
  widget_id text NOT NULL,
  default_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dashboard_id, widget_id)
);

CREATE INDEX IF NOT EXISTS idx_dwd_dashboard
  ON public.dashboard_widget_defaults(dashboard_id);

DROP TRIGGER IF EXISTS dwd_touch_updated_at ON public.dashboard_widget_defaults;
CREATE TRIGGER dwd_touch_updated_at
  BEFORE UPDATE ON public.dashboard_widget_defaults
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: all-read (defaults are not secret), admin-write only
ALTER TABLE public.dashboard_widget_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dwd_all_select ON public.dashboard_widget_defaults;
CREATE POLICY dwd_all_select ON public.dashboard_widget_defaults
  FOR SELECT USING (true);

DROP POLICY IF EXISTS dwd_admin_insert ON public.dashboard_widget_defaults;
CREATE POLICY dwd_admin_insert ON public.dashboard_widget_defaults
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'program_manager')
    )
  );

DROP POLICY IF EXISTS dwd_admin_update ON public.dashboard_widget_defaults;
CREATE POLICY dwd_admin_update ON public.dashboard_widget_defaults
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'program_manager')
    )
  );

DROP POLICY IF EXISTS dwd_admin_delete ON public.dashboard_widget_defaults;
CREATE POLICY dwd_admin_delete ON public.dashboard_widget_defaults
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'program_manager')
    )
  );

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'dashboard_widget_defaults';
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'dashboard_widget_defaults';
```

### Post-paste verification (after all 4 blocks land)

```sql
-- Final smoke test — all 4 changes visible
SELECT 'demand_process_steps cols' AS check, count(*) AS ok
FROM information_schema.columns
WHERE table_name = 'demand_process_steps'
  AND column_name IN ('is_landing', 'is_business_owned', 'is_it_owned');
-- expect: 3

SELECT 'product_roles col' AS check, count(*) AS ok
FROM information_schema.columns
WHERE table_name = 'product_roles' AND column_name = 'is_workload_relevant';
-- expect: 1

SELECT 'new tables' AS check, count(*) AS ok
FROM information_schema.tables
WHERE table_name IN ('user_widget_settings', 'dashboard_widget_defaults');
-- expect: 2

SELECT 'rls enabled' AS check, count(*) AS ok
FROM pg_tables
WHERE tablename IN ('user_widget_settings', 'dashboard_widget_defaults')
  AND rowsecurity = true;
-- expect: 2
```

## Lessons candidates (Phase 6 — awaiting Vikram approval)

### 2026-05-15 — Multi-tenant productization rule: NO hardcoded names, role labels, or stage counts in dashboard widgets
**Surface:** Any dashboard widget shipped to multi-tenant Catalyst customers
**Pattern:** Mockup hardcoded "Vikram Indla" as Delivery Manager, "Delivery Managers"/"Product Owners" as section titles, "11 stages" in widget subtitles. Catalyst is a multi-tenant SaaS — every customer has different stages, role names, and people.
**Rule:** Dashboard widgets MUST source: (a) people from `profiles` table via current_user/assigned-user, (b) role labels from `useProductRoles()`, (c) stage names + counts from `useActiveDemandProcessSteps()`. Zero hardcoded names, role labels, or stage-count integers in widget code. Mockups for review may use placeholder names but production code: forbidden.
**Severity:** P0

### 2026-05-15 — Dashboard widget config table pattern (canonical)
**Surface:** Any new configurable dashboard widget
**Pattern:** Widgets needing per-user config consistently use the pair (`user_widget_settings` per-user + `dashboard_widget_defaults` tenant-wide). Settings panels open via gear icon and persist on save. Two-tier read: per-user override first, tenant default fallback.
**Rule:** Use `useWidgetSettings(widgetId)` hook for any widget config. Do NOT roll a per-widget config table — extend `user_widget_settings.config jsonb` with widget-specific schema. Tenant admins set defaults via `/admin/dashboards`.
**Severity:** P1

### 2026-05-15 — AI feature gateway pattern: extend ai-improve-story with new improve_type
**Surface:** Any new AI feature on Catalyst
**Pattern:** AI features should NOT spin up new edge functions per use-case. The `ai-improve-story` function is the canonical AI gateway and accepts an `improve_type` param that dispatches to different prompt templates (translate_text, summarize_comments, br_postmortem, etc.).
**Rule:** New AI features add a new `improve_type` to `ai-improve-story` + a dispatcher branch. Zero new edge functions for prompt-only features. Reserve new edge functions for AI features that need different IO contracts (e.g. streaming, file output).
**Severity:** P1

## Copy-paste block (next session first message)

```
Continuing preflight from 2026-05-15. Surface: Product Dashboard v2 (post-feedback rebuild). Tier: high-stake.

Plan locked: 8 groups, 34 rows, ~10-11 sessions. Decisions:
- All 6 widgets configurable in v1
- Stage Drill-Down Drawer ships all 4 unique features (AI summary inline / BR-Epic-Story-Incident colour tree / stage handoff SLA timeline / owner accountability footer)
- AI Post-Mortem v1 = 5 sections, bulleted markdown, reuses ai-improve-story
- Skip HTML mockup, go straight to React on localhost:8080

Reading Phase 0.5 register: 8 P0 halts to address (A1, A2, A3, A4, A6, A8, A11, A12, A13, W3). All plan-resolvable.

Starting Group 1 (Schema foundation - 5 rows). I will hand 4 SQL blocks for Vikram to paste in Lovable, then verify with a Vitest schema test.

Handover file: /Users/vikramindla/Documents/GitHub/catalyst-prod-45/.obsidian-vault/active/preflight-handover-2026-05-15-product-dashboard-v2.md
```
