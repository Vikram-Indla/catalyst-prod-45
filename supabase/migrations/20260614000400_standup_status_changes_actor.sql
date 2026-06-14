-- Standup Phase 6 follow-up — record the ACTUAL user who triggered a
-- status change during a standup, not just the panel-selected speaker.
--
-- Why: `speaker_name` is set from the panel's currentSpeakerNameRef,
-- which represents "whose turn the panel says it is" — not "who
-- actually clicked drag/drop". When a facilitator (e.g. Vikram) runs
-- the standup and moves cards on behalf of teammates, every change
-- gets attributed to the panel-selected name even though Vikram is
-- the click-actor. This new column captures the authenticated user
-- so detail-view consumers can attribute correctly.
--
-- `speaker_name` stays as the panel-context metadata — useful for
-- correlation queries ("which moves happened while Ayaz was the
-- nominal speaker"), just no longer surfaced as authorship.

BEGIN;

ALTER TABLE public.standup_status_changes
  ADD COLUMN IF NOT EXISTS changed_by_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS standup_status_changes_changed_by_user_id_idx
  ON public.standup_status_changes (changed_by_user_id);

COMMENT ON COLUMN public.standup_status_changes.changed_by_user_id IS
  'The auth.users row of the user who actually clicked drag/drop (or rowMenu) to move the ticket. Distinct from speaker_name, which records the panel-selected nominal speaker at the same moment.';

COMMIT;
