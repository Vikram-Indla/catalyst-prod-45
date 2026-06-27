# 01 — Objective

Feature Work ID: `CAT-ADMIN-AI-CMD-CENTER-20260627-001`

## Primary Objective

Transform `/admin/ai-assistant` from a blank chat surface into an enterprise-grade AI Admin Command Center.

## Current Problem

- Page is visually weak, mostly empty, overly centered
- Looks like a simple chatbot — not suitable for high-risk admin operations
- Users/roles/permissions/password-reset/invitations/departments all use same blank chat area
- No command library, no action plan preview, no stats context, no audit history
- P0 bugs in edge function: hardcoded 'developer' role, assign_product_role deletes existing roles

## Success Definition

1. Page looks enterprise-grade — dense, readable, full-width
2. Every AI request goes through: natural language → intent → current-state check → plan → confirmation → execution → audit
3. Every risky action (permissions, delete) requires explicit modal confirmation
4. Every completed action has a final result + audit summary
5. ADS/Catalyst token compliance throughout
6. P0 edge function bugs fixed
7. Zero admin shell regression
8. Zero light-mode regression

## Non-Scope

- Do NOT create a new route
- Do NOT create a new admin section or sidebar item
- Do NOT integrate with external audit systems (in-app summary only)
- Do NOT add i18n/RTL (not present in admin pages today)
- Do NOT change other admin pages
- Do NOT rewrite useAdminAiAssistant.ts entirely — extend it
- Backend plan_id hardening (Phase 2) — UI prepares field, backend wiring deferred
