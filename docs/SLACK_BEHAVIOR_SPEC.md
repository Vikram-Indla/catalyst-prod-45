# Slack Behavior Specification — Catalyst Chat (researched 2026-06-10)

Source of truth: Slack Help Center. DOCUMENTED = verified in help article. UNCERTAIN = not building (Vikram rule), EXCEPT items visible in Vikram's reference screenshots (date dividers, "New" line, (edited) marker, message grouping) — screenshots override DO-NOT-BUILD.

## 1. Channels
- Names lowercase, no spaces/periods, <80 chars. [help/201402297]
- Public/private at creation. Public browsable+joinable by all members; private = invite only. [help/205239967]
- Archive: closed to new activity, history searchable. Unarchive: private restores members, public does NOT. Archived name not reusable until unarchived. Delete = permanent, admin-only; default channel never archivable/deletable. [help/213185307]
- Notification prefs per channel: everything / mentions / nothing; mute hides + suppresses, but numbered badges STILL show on mention/DM. [help/201355156, 204411433]

## 2. DMs + group DMs
- 1:1 or group up to 9 total. Can add people to existing DM. [help/212281468]
- Group DM → private channel conversion: requires name, history visible to new members, members notified, not reversible. [help/217555437]
- Hide/mute DM removes from sidebar, keeps history. [help/204411433]

## 3. Threads
- Replies stay in thread, not in channel main view. "Also send to #channel" checkbox; retroactive share via ⋯. [help/115000769927]
- Auto-follow: 1:1 DM = all threads; channels/group = only if started/replied/mentioned. Per-thread follow/unfollow toggle. [help/115000769927]
- Threads view: followed threads, unread sorted top, highlighted. Thread messages markable unread. [help/115000769927]

## 4. Activity
- Tabs/filters: Unreads, DMs, Mentions, Threads, Channels, Reactions, Invitations. Custom saved filter views as reorderable tabs. [help/19693583638803]
- Read on reply; bulk select → clear / mark all read; cleared → "Cleared notifications". [help/19693583638803]

## 5. Mentions
- @channel = all members incl. away. @here = active members only. @everyone = default channel only. None fire in threads; none bypass DND. Confirm dialog when channel ≥6 members. [help/202009646]

## 6. Unreads
- Mark unread via ⋯ or Option/Alt+Click. Esc = mark conversation read; Shift+Esc = all read. [help/201374536]
- Unreads view ⌘⇧A: per-conversation mark read, mark-all + undo, collapsible. [help/226410907]
- Numbered badges = mentions + DMs; channel unread = bold name (badge rule documented; bold rule inferred). [help/204411433]

## 7. Save for Later
- Save via hover icon. Later view tabs: In progress / Archived / Completed. Reminders on saved items (preset/custom); due-reminder filter. [help/360042650274]

## 8. Reactions
- Hover → add; click own to remove; own highlighted blue; hover shows who. Reactions surface in Activity→Reactions. [help/206870317]

## 9. Edit/delete
- Edit/delete own, no time limit (admin-restrictable). Unsend within 15s desktop. Delete permanent, no bulk. ↑ in empty composer edits last message. [help/202395258, 201374536]

## 10. Search
- Modifiers: from:@, in:#, with:@, before:/after:/on:/during:, has::emoji:/pin, is:saved/thread. Quotes exact, -exclude, * wildcard 3+ chars. Result tabs: Messages/Files/People/Channels. ⌘G global, ⌘F in-channel. [help/202528808]

## 11. Presence/status
- Active while app open; away after 10 min inactivity; manual toggle. Custom status = emoji+text, auto-clear duration, can pause notifications. DND: presets/custom/recurring schedule, snooze icon, /dnd commands. [help/201864558, 214908388]

## 12. Drafts & scheduled send
- Unsent text auto-drafts → "Drafts & sent" sidebar item. Schedule via send-arrow; Scheduled tab: edit/reschedule/send-now/cancel. [help/201457107, 1500012915082]

## 13. Keyboard shortcuts (canonical)
⌘K jump · ⌘⇧A unreads · ⌘⇧T threads · ⌘⇧M activity · ⌘[/⌘] history · Esc read · ⇧Esc all read · ↑ edit last · ⇧Enter newline · ⌘B/I bold/italic · ⌘⇧X strike · ⌘⇧C code · ⌘F in-channel search. [help/201374536]

## DO-NOT-BUILD (UNCERTAIN, no screenshot evidence)
Leave-channel system messages · channel details tab structure · member removal rules · history visibility on public join · close-DM X semantics · thread-reply channel-unread rule · activity badge formula · reaction cap/notify rules · deleted-thread-parent tombstone · scheduled-send window · Windows DM shortcut combo.

## BUILD-ANYWAY (UNCERTAIN but in Vikram's reference screenshots)
Date divider pills (sticky, "Monday, April 6th ⌄") · red "New" unread divider · "(edited)" suffix · consecutive-message grouping (avatar suppressed within ~5 min) · paused-notifications banner above composer ("X has paused their notifications").
