# Session 003 — W1 screenshot pass (live acceptance)

**Date:** 2026-07-10 · **App:** localhost:8080 (`npm run dev:strata`, .env.development → staging) · **Driver:** Chrome MCP, authenticated session (Vikram)

## Acceptance walk (all screenshots attached in chat, session 003)

1. **Strategy Room** — bonus evidence: the Catalyst-context seed renders live
   (Investor Experience Leadership → Investor Journey Transformation → Digitize the
   End-to-End Investor Journey → Launch unified investor onboarding; Investment
   Operations Excellence → Industrialize Core Investment Operations; owners resolved).
2. **Reviews & Decisions** — cockpit loads; snapshot SNAP-1 (Q1 FY2027 Review proof,
   LOCKED) selected; §04 Distribution & audit shows **Board packs 0 / "No board packs"**
   baseline; new tooltip visible ("…downloads it, and stores it to the shared pack library").
3. **Generate board pack (PDF)** clicked →
   - Success banner: "SNAP-1-board-pack.pdf downloaded and stored to the pack library —
     anyone with STRATA access can retrieve it from this list."
   - Pack count 0 → 1; row `PDF · READY · 10 Jul 2026, 15:37 · Download`.
4. **DB ground truth (staging SQL, same minute):** strata_board_packs row
   format=pdf, status=ready, storage_path=`SNAP-1/SNAP-1-board-pack.pdf`,
   generated_at set; storage.objects contains exactly that object in
   `strata-board-packs`. (Two unrelated old `pending` rows belong to another
   snapshot — untouched, as designed.)
5. **Hard reload** of /strata/reviews → pack row PERSISTS (rendered from DB, not
   local state); Download button present.
6. **Download click** → new tab opened at
   `…supabase.co/storage/v1/object/sign/strata-board-packs/SNAP-1/SNAP-1-board-pack.pdf?token=…`
   — signed JWT scope=download, iat→exp = exactly 3600s. Chrome renders the 2-page
   pack: cover (snapshot key/status/cycle/locked-at + provenance note), Summary
   frozen-record counts, Frozen evidence (Enterprise Revenue Growth · Achievement pct
   83.3), Decisions (none on snapshot), Open actions (none), Provenance appendix.
7. **Console:** zero errors/exceptions on the Reviews tab during the whole walk.

## AC disposition (Plan Lock W1)

| AC | Result |
|---|---|
| generate → row ready with storage_path | PASS (UI + SQL) |
| hard reload → download works | PASS |
| private bucket, signed-URL only | PASS (bucket public=false; signed link observed) |
| second user with role can download / without role cannot | **Not exercised live** — single authenticated session available. Enforcement verified at policy level: storage read = `current_user_is_approved()`, writes = `strata_has_role(['strategy_office'])` (probed on staging). Flag for Vikram's multi-user pass if desired. |

**W1 disposition: PASS** (one AC leg verified at policy level rather than dual-session — noted honestly above).
