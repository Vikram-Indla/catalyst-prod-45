
# Jira Bi-Directional Sync — Full Replacement Plan

## Phase 1: Database Schema (Migration)
Create all 11 sync infrastructure tables + `next_issue_key` function in a single migration:
- `project_sequences` — issue key generator
- `catalyst_issues` — replaces `ph_work_items`/`ph_issues` as primary issue table (with RLS)
- `sync_entity_map` — bidirectional entity mapping
- `sync_events` — inbound/outbound event queue
- `sync_status_map` — per-project status mapping
- `sync_user_map` — Jira↔Catalyst user identity mapping
- `sync_conflicts` — conflict tracking
- `sync_health` — sync health monitoring
- `sync_dead_letter` — failed webhook DLQ
- `sync_connections` — webhook IDs, tokens, connection registry
- `sync_cooldowns` — echo loop prevention

**Note:** This creates the NEW tables alongside existing ones. We do NOT drop old tables yet — that happens in a future migration phase after UI is rewired.

## Phase 2: Edge Function
- Create `jira-webhook-receiver` edge function
- Receives Jira webhook POSTs, validates payload, inserts into `sync_events` with idempotency
- Add `verify_jwt = false` to config.toml
- Deploy and test

## Phase 3: Sync Settings UI
- New page at `/projects/:projectId/sync-settings`
- Connection status card
- Status mapping table
- Sync direction selector
- Sync health card
- Recent sync events table
- All using TanStack Query + shadcn + V12 design tokens

## NOT in scope (future phases):
- Rewiring existing ProjectHub views from `ph_work_items` → `catalyst_issues`
- Data migration from old tables to new
- Dropping old tables
- Event processor edge function (processes `sync_events` queue)
