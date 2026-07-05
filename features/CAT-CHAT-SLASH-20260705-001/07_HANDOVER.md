# Handover — CAT-CHAT-SLASH-20260705-001

## State: 3 of 4 built + shipped; 1 blocked on whitelist. No regression.

Sequence requested: slash commands → channel read receipts → i18n/RTL → huddle>4.

1. Slash commands (03fbbb8cd) — SlashCommandPicker mirrors the @-mention system;
   trigger only at message start (Slack semantics, verified no mid-text/mention collision).
   Text inserts /shrug /tableflip /unflip /lenny; action /huddle (real handler). 8 tests.
2. Channel read receipts (64a461e41) — extended computeSeenCaption to channel/custom_channel
   → "Read by N" using existing last_read_at, NO schema. Restraint: own-last-message only.
   Live-proven "Read by 2" on the 53-member Senaei BAU channel. 14 tests.
3. RTL shell mirroring (5646e4cd6) — dir="rtl" on shell root when useLanguage()==='ar' mirrors
   the whole grid/flex/text automatically; English stays ltr byte-identical (verified). Quote
   bar made logical (border-inline-start). Live-proven both directions.
4. Huddle >4 (SFU) — BLOCKED, whitelist request in 04_HUDDLE_SFU_WHITELIST_REQUEST.md.
   Recommends LiveKit Cloud. Needs Vikram's SFU choice + billing OK before a Plan Lock.

## En-route fix
- 64056af — HuddleEventRow test was leak-dependent (no useAuth mock) + stale (asserted
  with_name, component uses eventMeta.participants). Made self-contained + tests real behavior.

## Gates
tsc clean; chat suites 113/113 0-failed-suites (JSON-verified); RTL/EN live-verified;
ads delta zero (the standing +N is another session's testhub-lab WIP).

## Not done (honest)
- Full UI-string i18n: deliberately NOT machine-translated (would fabricate Arabic). RTL
  layout done; localized copy needs a real translation source.
- Huddle >4: awaiting SFU whitelist decision.
