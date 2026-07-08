# CAT-VOICE-UX-PREMIUM-20260708-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

[Entries will be appended as decisions are made]

## 2026-07-08 — Lock-time decisions
- D1: voice_dictation_settings table superseded by user_preferences (scopes voice_flow, translate). Never create it.
- D2: Hotkeys (double-space/⌘⇧V) stay GLOBAL on eligible fields; allowlist governs visible mic buttons only (AD-1).
- D3: Single Space never a voice control (Critic ruling). Esc=cancel w/ stopPropagation; Enter/click/chords=commit.
- D4: Live-inline partials ship for chat composer via tracked-offset inserts; PM instability fallback = ghost-only + single insert on commit.
- D5: Read-side translate cached per messageId in react-query; no DB persistence this feature.
- D6: Sound ping OFF by default. Word count CUT. Count-up timer kept.
- D7: Execution pre-authorized by Vikram via /loop 2026-07-08 ("implement all actions until completed as per plan lock").

### Open questions (non-blocking, resolve in-slice)
- Q1: Gemini Live session limits / sessionResumption on ephemeral tokens — live probe during S3a; fallback = re-mint+reconnect.
- Q2: CE cancel-delete risk — mitigated by D4 fallback.
- Q3: Native-EN interims through livePartials — YES (locked).
- Q4: Translated send drops rich ADF — accepted for this feature (fast-follow).
- Q5: Session audit columns (paused_ms, lane, health) — only first_partial_ms locked (S6a); rest fast-follow.
- Q6: 4-min segment rotation seam (~50-150ms loss) — accepted for fallback lane.
- Q7: 14-min warning surfaces in capsule only (no toast).
