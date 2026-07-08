# CAT-VOICE-UX-PREMIUM-20260708-001 — Screenshot Checklist

> QA/Screenshot Validator protocol (agent output 2026-07-08). All screenshots on `localhost:8080/chat` unless named. **[L/D] = capture in BOTH light and dark** — dark via reload-into-dark, never runtime toggle. Screenshots prove pixels; Section B probes prove function. Both required per slice.

## Status
PENDING — awaiting implementation.

## A. Screenshot checklist

### S1/S2 — Composer-anchored morphing mic + surface gating
1. [L/D] Idle composer, no focus/hover — mic anchor visible in composer chrome, NO floating hover cluster anywhere.
2. [L/D] Composer hovered — mic affordance with discernible purpose (not tooltip-only), NO ع/A icon (composer empty).
3. [L/D] Mic clicked → same anchor morphed to listening — bars animating, mic did NOT vanish, no detached capsule elsewhere. Two frames ≥500ms apart proving bars move.
4. [L/D] Arbitrary NON-key surface (admin input, filters search) hovered — ZERO voice/translate affordance (icon-noise kill shot).
5. [L/D] Work-item description editor — mic present (allowed surface).
6. [L/D] DocIntel AskPanel — per Plan Lock (explicit mic beside Ask, or excluded).

### S1 — Session lifecycle
7. [L/D] Listening at t≈5s — count-up timer (counting UP).
8. [L/D] **15s-pause survival**: speak, stay silent 15s, screenshot at silence+16s — still listening, session NOT ended, no auto-commit.
9. [L/D] Paused state — visually distinct (bars frozen/"Paused"), resume affordance visible.
10. [L/D] Resumed — back to listening visuals.
11. [L/D] Explicit stop → processing on the SAME anchor.
12. [L/D] Committed: solid text in composer, anchor back to idle, caret at end.
13. [L/D] Esc-cancel: pre-seed `Draft before dictation — do not lose me` → dictate → Esc → composer restored exactly.

### S3 — Live inline transcript
14. [L/D] Mid-sentence EN: grey provisional inline IN composer. Speak: `The quarterly release train departs on Thursday`.
15. [L/D] Provisional→solid before/after pair.
16. [L/D] Mid-sentence AR (speak): `أريد ترجمة هذا النص إلى الإنجليزية بسرعة` — RTL partials correct.
17. [L/D] Mixed bidi (speak): `English word ثم عربي؟` — trailing ؟ correct side, partial not scrambled. Also corpus #6.
18. [L/D] Realtime-lane degraded (block WS via devtools) → visible "live captions unavailable — will transcribe on stop", NOT silent "Listening…".
19. [L/D] Degraded end-to-end: stop → batch transcript still commits (never-lose-words).

### S4 — Write-side translate
20. [L/D] **Empty composer crop — NO translate affordance** (focused + hovered).
21. [L/D] Arabic content (corpus #2) — translate affordance visible.
22. [L/D] English-only content — no AR→EN chip (language gate).
23. [L/D] AR→EN mode chip active, labeled, attached to composer.
24. [L/D] Preview-before-send: Arabic + English both visible, Apply/Keep-original controls.
25. [L/D] After apply: English committed, undo/revert affordance visible.

### S4a — Read-side translation
26. [L/D] Arabic incoming bubble (corpus #1) with "See translation" link.
27. [L/D] After click — English + "See original" link.
28. [L/D] After "See original" — full reversal cycle.
29. [L/D] English incoming message — NO link (read-side gate).

### S5/S6 — Bidi/RTL + premium polish
30. [L/D] Corpus #6 committed — dir="auto" rendering sane (+ probe B14).
31. [L/D] Arabic bubble — Arabic font stack (shaping correct, no tofu).
32. [L/D] Listening border on composer while dictating (1px var(--ds-border-accent-magenta), no glow).
33. [L/D] Live language-detect chip mid-dictation.
34. [L/D] Polish diff/undo: cleaned text + "show original"/undo affordance; diff view.
35. Composite morph-continuity strip: idle/hover/listening/paused/processing side-by-side per theme.

## B. Functional probes (Chrome MCP javascript_tool; raw output → 06_VALIDATION_EVIDENCE.md)

- B1 Icon-noise kill: hover arbitrary admin input → `document.querySelectorAll('[data-catyflow-cta]').length === 0` (update selector if renamed).
- B2 Anchor persistence: same node across idle→listening→processing (`document.contains(el)` true, not remounted).
- B3 15s survival: after 16s silence `data-voice-status === 'listening'` (implementation MUST expose data-voice-status — Plan Lock testability requirement).
- B4 Config regression: `grep -n silenceAutoStopMs src/features/voice-flow/voiceFlow.config.ts` → gone.
- B5 Esc restore strict equality incl. trailing space.
- B6 Provisional marker: provisional span `[data-voice-provisional]` computed color ≠ solid color; composer contains partial mid-dictation.
- B7 First-partial latency via performance marks; target <2000ms healthy lane; record ms.
- B8 Silent-failure ban: WS blocked → degraded message node in DOM + structured console warn, no uncaught error.
- B9 Empty-field gate: composer empty → zero translate nodes after focus+hover+50ms.
- B10 Preview non-destructive: composer value unchanged while preview open; Apply changes; undo restores original Arabic.
- B11 Read-side reversal: "See original" text strictly equals pre-translation innerText.
- B12 No auto-commit unseen: composer stable through processing→ready until confirm (where preview mode on).
- B13 Explicit stop paths: stop control and commit-chord → listening→processing, never skipping to cancelled.
- B14 Bidi: composer dir="auto"; <bdi> present after corpus #6 commit; bubbles dir="auto".
- B15 Font stack: computed fontFamily of Arabic bubble includes Arabic stack member.
- B16 ADS gates: `npm run lint:colors:gate` + `npm run audit:ads:gate` pass + CLAUDE.md grep on touched files. Raw output pasted.
- B17 `npx tsc --noEmit`, `npm run build`, `npx vitest run src/features/voice-flow` green.
- B18 Session cap: config value matches Plan Lock (15-min + 14-min warning).

## C. Regression sweep

- R1 double-space in non-key field — behavior per Plan Lock (hotkeys stay global); typing "word  word" fast never eaten where voice disabled.
- R2 DocIntel AskPanel end-to-end incl. Arabic question (corpus #1) — don't regress Reservoir AR Q&A.
- R3 Command mode (selection + dictate) still reachable + applies edit.
- R4 Sensitive fields (password, /otp/i, /api.?key/i…) — no affordance, hotkey inert.
- R5 BLOCKED_INPUT_TYPES — hotkey inert.
- R6 Existing tests stay green or consciously updated (log 08_DRIFT_LOG): cancelRestore, insertTextIntoTarget, useActiveTextTarget, useVoiceHotkey.
- R7 Description/comment editors: dictation + no translate icon on empty; ADF editing unaffected.
- R8 Chat non-voice paths: typed send, attachments, reactions, huddle unchanged.
- R9 voice-transcribe batch still 200; record latency (baseline 10.4s).

## D. Bidi/RTL corpus (paste and/or speak verbatim)

1. `مرحبا، متى سيتم إصدار النسخة الجديدة؟`
2. `أحتاج إلى تحديث تذكرة CAT-1234 قبل الاجتماع`
3. `Please review الملف المرفق before Thursday`
4. `English word ثم عربي؟`
5. `الإصدار 2.5.1 جاهز للنشر في 10:30 صباحاً`
6. `قال المدير: "deploy at 5pm" ثم غادر.`
7. `٧٥٪ من المهام مكتملة (75% done)`
8. `hello مرحبا hello مرحبا`
9. `ما هو الـ ETA للـ release؟`
10. `- بند أول\n- second item`

Per string: (a) paste → screenshot; (b) dictate where speakable → grey partial + solid; (c) send → bubble; (d) translate link where foreign.

## E. Signoff gate

- Naming: `S<slice>-<item#>-<light|dark>.png` under `features/CAT-VOICE-UX-PREMIUM-20260708-001/evidence/`.
- No slice merges without: Section A rows + Section B raw output + R6 test run + B16/B17 green.
- Screenshot without paired B-probe ≠ acceptance.
