-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice E2: plan live/locked flag
-- V2: a Test Plan is a curated reference set that is either live-reference
-- (follows latest published versions) or locked-reference (frozen). The
-- existing create_plan_version BEFORE UPDATE trigger snapshots the plan row on
-- every update, so flipping the flag records a version automatically.

ALTER TABLE public.tm_test_plans
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid;
