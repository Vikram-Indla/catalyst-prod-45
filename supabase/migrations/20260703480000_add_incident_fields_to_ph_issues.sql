-- CAT-CONVERGENCE-UI-FIX-20260703-001 Phase 1: Schema extension for incident convergence
-- Add incident-specific columns to ph_issues to enable unified incident creation workflow

-- Add incident-specific columns to ph_issues table
ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS incident_key TEXT UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS workflow_status_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sla_record_id UUID REFERENCES public.sla_records(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS committee_id UUID REFERENCES public.incident_committees(id) ON DELETE SET NULL DEFAULT NULL;

-- Create index on incident_key for lookups
CREATE INDEX IF NOT EXISTS idx_ph_issues_incident_key ON public.ph_issues(incident_key) WHERE incident_key IS NOT NULL;

-- Create index on committee_id for incident committee queries
CREATE INDEX IF NOT EXISTS idx_ph_issues_committee_id ON public.ph_issues(committee_id) WHERE committee_id IS NOT NULL;

-- NOTE: Backfill from ph_incidents deferred to Phase 2 (after incident-to-ph_issues linking is established)
-- Phase 1 focus: schema extension only
-- Backfill will populate severity from ph_incidents.priority once FK/join relationship is clear
