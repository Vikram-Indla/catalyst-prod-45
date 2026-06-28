# Objective — CAT-TESTHUB-REPORTS-20260627-001

## Goal
Transform the existing Test Hub Reports UI from a basic tile grid + plain table layout into an executive-grade, enterprise premium Reporting Command Center.

## Current State
- ReportsPage: tile grid of 22 report cards — functional but basic
- ReportDetailPage: individual report pages with plain HTML tables — all 22 reports already query real staging Supabase data
- No charts anywhere in testhub
- recharts + d3 already installed in package.json

## What We're Building
A premium left-nav + main canvas command center replacing the current tile→detail-page navigation pattern:
- Left navigator with grouped report list + status badges
- Persistent filter bar
- Recharts-powered chart zone (line, bar, area, pie)
- Drilldown table
- AI insight panel (seeded summaries in lab; real Gemini after approval)
- Formula/explanation drawer
- Top KPI ribbon (expanded: 8 metrics)

## Non-Scope
- No new Supabase tables before approval
- No production access
- No package installation (recharts already present)
- No redesign of other Catalyst pages
- No Gemini Gateway changes in lab phase
