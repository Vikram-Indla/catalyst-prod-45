# 01 — Objective

## What "done" looks like

When user toggles flag on any `ph_issues`-backed surface (kanban card menu, table context menu, detail-view flag button):

1. The existing `AddFlagModal` opens with optional reason textarea. UI unchanged.
2. On Confirm:
   - `ph_issues.is_flagged` + `flag_reason` updated (existing behavior).
   - New `ph_comments` row inserted with `comment_type = 'flag_added' | 'flag_removed'` and `body = <optional note>` (empty string when user did not type a reason).
   - New `ph_activity_log` row inserted with `field_name = 'Flagged'`, `old_value = 'None' | 'Impediment'`, `new_value = inverse`, `action = 'field_updated'`.
3. The `ActivityFeed` panel on the work-item detail view then shows:
   - In **Comments** and **All** tabs — a comment entry with orange (flag added) or gray (flag removed) `FlagFilledIcon` + "Flag added" / "Flag removed" header line, followed by the optional body line if `body` is non-empty. Editable via the existing pen icon → same header + body rendered inside the `RichTextEditor` edit surface.
   - In **History** and **All** tabs — a history entry rendered as "`<Actor>` updated the Flagged" with `Impediment → None` or `None → Impediment`.

## Non-goals

- No new tab in Activity.
- No UI/copy changes to `FlagPopover` or `AddFlagModal`.
- No extension to `business_requests` / `tasks` / `rh_releases` / `tm_test_cases` (their tables get the modal, but no comment / history recording — flagged as follow-up).
- No changes to the flag icon on the card (`WorkItemCard.tsx:412`).

## Screenshots (Jira parity target)

- `Screenshot 2026-07-03 144707.png` — flag-added comment (orange icon + "Flag added" + optional body)
- `Screenshot 2026-07-03 144757.png` — flag-removed comment (gray icon + "Flag removed" + optional body)
- `Screenshot 2026-07-03 145505.png` — edit mode with same header + body inside RichTextEditor
- `Screenshot 2026-07-03 145717.png` — history entries "updated the Flagged" with Impediment ↔ None
- `Screenshot 2026-07-03 145842.png` — merged All tab with COMMENTS / HISTORY pills above each block
