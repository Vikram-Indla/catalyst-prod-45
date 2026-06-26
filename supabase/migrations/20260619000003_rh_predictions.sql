-- Release / Sprint Predictor cache (date-based engine; no story points)
-- One row per subject (a release uuid, or a sprint name). The edge function
-- `release-sprint-predictor` upserts here; the calendar + scorecard read it.

CREATE TABLE IF NOT EXISTS public.rh_predictions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind   text NOT NULL CHECK (subject_kind IN ('release','sprint')),
  subject_id     text NOT NULL,              -- release uuid (text) OR sprint name
  subject_label  text,                       -- human label snapshot
  predicted_pct  numeric,                    -- 0..100 stage-weighted by item count
  forecast_date  date,                       -- projected completion date (null if no pace)
  due_date       date,                       -- effective due of the subject
  slip_days      integer,                    -- forecast_date - due_date (null if unknown)
  risk           text NOT NULL DEFAULT 'no_data'
                 CHECK (risk IN ('on_track','at_risk','off_track','done','no_data')),
  item_total     integer NOT NULL DEFAULT 0,
  item_done      integer NOT NULL DEFAULT 0,
  item_overdue   integer NOT NULL DEFAULT 0, -- not done AND past its own due date
  time_used_pct  numeric,                    -- elapsed / window (0..100)
  observed_pace  numeric,                    -- items closed per day
  required_pace  numeric,                    -- items/day needed to hit due_date
  status_spread  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{status,category,count,weight}]
  reasons        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{kind,label,keys?}]
  narrative      text,                       -- Caty explanation (deterministic fallback)
  data_quality   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {no_due_dates, no_items, points_ignored:true}
  computed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rh_predictions_subject_uidx
  ON public.rh_predictions (subject_kind, subject_id);

ALTER TABLE public.rh_predictions ENABLE ROW LEVEL SECURITY;

-- Non-PII operational metric; readable by any authenticated session.
-- Writes happen only via the edge function (service role bypasses RLS).
DROP POLICY IF EXISTS rh_predictions_select_all ON public.rh_predictions;
CREATE POLICY rh_predictions_select_all
  ON public.rh_predictions
  FOR SELECT TO authenticated
  USING (true);
