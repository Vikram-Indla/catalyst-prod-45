# PLAN LOCK — CAT-NOTIFICATION-DIRECT-PANEL-POLISH-20260628-001
Status: APPROVED — implement now

---

## Objective
Fix notification Direct panel to match image 2:
1. Thread grouping: group multiple notifications from same entity+actor
2. Comment preview cards with reaction bar + Reply + View thread
3. Correct actor names (data fix for wrongly-seeded staging rows)

---

## Non-scope
- Reactions storage in DB (ph_comment_reactions is separate concern)
- "Jira Sync assigned" for old bulk-sync items — that label is CORRECT (actor unknown)
- WatchingTab changes
- Push notifications / badge count changes
- Any new Supabase tables or migrations

---

## 2-Hour Timebox
Slice 1 (this session): thread grouping + comment preview in DirectPanel

---

## Canonical Components Selected
| Component | Usage |
|---|---|
| `DirectNotificationRow.tsx` | modify only — add aggregation badge render |
| `MentionActivityCard.tsx` | already used for verb='mentioned'; extend to 'commented' |
| `CatalystAvatar` | existing, no change |
| `@atlaskit/lozenge` | for status badges (already used) |
| `@atlaskit/primitives Box/xcss` | layout (already used) |
| `token()` from @atlaskit/tokens | all colors — no bare hex |

NO hand-rolled UI. NO new color constants.

---

## Files to Modify
| File | Change |
|---|---|
| `src/features/notifications/DirectPanel.tsx` | Add grouping logic before mapNotification; route 'commented' to MentionActivityCard |
| `src/features/notifications/types.ts` | Add `groupedIds?: string[]` to DirectAggregation |
| `src/features/notifications/components/DirectNotificationRow.tsx` | Render aggregation count badge; pass through thread data |
| `src/features/notifications/utils/date.ts` | No change |
| `src/features/notifications/resolveActorIdentity.ts` | No change — code is correct |

## Files Forbidden
- `supabase/` — no migrations
- `src/integrations/supabase/types.ts` — no schema changes
- Any file not in above list

---

## Data / Backend Rules
- Grouping is purely in-memory (no DB query changes)
- `comment_preview` may be null — MUST guard: only render card when non-empty
- `reactions` in metadata is unreliable — render empty state gracefully, no fake data
- Zero-assumption: never render a count or name that isn't in the data

---

## Grouping Algorithm
```
rawNotifications (sorted by created_at DESC)
  → group by entity_id + actor identity (actor_user_id || actor_display_name || 'system')
  → per group: first item = primary, rest = collapsed
  → set aggregation = { count: collapsed.length, actor: primary.actor }
  → mapNotification on primary only
  → DirectNotificationRow renders "+N updates from [actor.displayName]" when aggregation.count > 0
```

---

## UI Rules (ADS tokens only)
- "+N updates" text: `var(--ds-text-brand)` (link blue)
- Comment card border: `var(--ds-border)`
- Comment card bg: `var(--ds-surface-raised)`
- All spacing via `space.*` ADS tokens via xcss
- NO bare hex, NO Tailwind color utilities

---

## Screenshot Checklist
- [ ] "Today" section shows correct actor names (not "Jira Sync" for trigger events)
- [ ] Multiple notifications from same person+entity are grouped
- [ ] "+N updates from [name]" appears below primary row
- [ ] Comment type notifications show preview card
- [ ] Reaction bar visible on comment cards
- [ ] Reply + View thread buttons visible

---

## Stop Conditions
- Any regression in MentionActivityCard display → revert
- Any bare color introduced → fix before commit
- Grouping causes duplicate entity_ids in the list → stop and debug

---

## Staging Data Fix (before code work)
Update the wrongly-seeded rows on staging cyij:
- BAU-6106 and BAU-6086: set actor_display_name to actual reporter name from ph_issues
