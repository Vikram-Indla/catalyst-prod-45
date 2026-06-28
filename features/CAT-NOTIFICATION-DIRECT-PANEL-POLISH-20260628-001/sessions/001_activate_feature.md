# Session 001 — Activate Feature
Date: 2026-06-28
Purpose: Discovery + Plan Lock

## Discovery Agents Run (parallel)
1. Canonical Component Discovery → MentionActivityCard, ReactionBar, DirectNotificationRow already have thread card
2. Integration Architect → resolveActorIdentity Layer 3 is correct; "Jira Sync" bug = wrong seed data
3. UI/UX Critic → grouping algorithm + ADS token usage
4. Data/Safety Guard → comment_preview nullable; reactions not in notifications table
5. Implementation Planner → 5 files, no new files, 2-hour slice

## Key Decisions
- resolveActorIdentity.ts: NO CHANGE (code correct)
- Grouping: in-memory only, entity_id + actor key
- MentionActivityCard: extend to also render 'commented' verb (not just 'mentioned')
- Reactions: render empty state when not in metadata (no fake data)

## Plan Lock Status: DRAFT
