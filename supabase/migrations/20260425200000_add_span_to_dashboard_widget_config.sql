-- Apr 25, 2026 — Add `span` column to dashboard_widget_config
--
-- Persists per-user, per-project widget grid-span (1..12) for the new
-- 12-column dashboard layout. Nullable initially: rows that predate
-- this column fall back to WidgetDefinition.defaultSpan at runtime.
--
-- Owner: Vikram. See widget-registry.ts SPAN_LADDER for valid values
-- and the runtime fallback in DashboardWidgetGrid.tsx.

ALTER TABLE public.dashboard_widget_config
  ADD COLUMN IF NOT EXISTS span integer NULL;

ALTER TABLE public.dashboard_widget_config
  DROP CONSTRAINT IF EXISTS dashboard_widget_config_span_check;

ALTER TABLE public.dashboard_widget_config
  ADD CONSTRAINT dashboard_widget_config_span_check
  CHECK (span IS NULL OR (span BETWEEN 1 AND 12));

COMMENT ON COLUMN public.dashboard_widget_config.span IS
  '12-column grid span (1..12). NULL = fall back to WidgetDefinition.defaultSpan.';
