# Handover — Feature 4: Copy WhatsApp Summary

**For:** Claude Code. **Author:** Claude Co-Work. **Date:** 2026-06-12.
**Branch:** `feature/filter-whatsapp-summary` off `main`.
**Nature:** clipboard-first text generator. **Deterministic counts + OPTIONAL AI phrasing/translation.** No WhatsApp API, no sending, no persistence (v1).

Re-read `CLAUDE.md`. **§3 + §7 (the AI rule) are the most important.**

---

## 1. Context & status
Kanban (built), Roadmap (handover), Dashboard (handover). **This is Feature 4.** Remaining after: What Changed Since Last Visit, Pin to Workspace. AI gateway is Gemini-direct (`generativelanguage.googleapis.com`) via existing Supabase edge functions.

## 2. Non-negotiable rules
1. **Atlaskit-only for new code**; icons from `@/lib/atlaskit-icons`; tokens + 4/8/16 grid; no Radix/Tailwind/lucide.
2. **Reuse-first** — counts via the filter result path; existing clipboard + toast utils.
3. **Source filter is truth** — summary reflects the filter's CURRENT live results; never include data the user can't see.
4. **Zero-assumption / no fabrication (P0, doubly here):** every number computed from real results. The LLM is NEVER given authority over a count — it only rephrases/translates assembled text. Unknown count → omit, never invent.
5. **Privacy (P0):** exclude private comments + restricted fields; aggregate-only fallback when details are restricted.
6. **AI is optional** and must fall back gracefully to deterministic text on any error.
7. **Vertical, TDD, small steps, stop-and-confirm.** When in doubt, ask JK.

## 3. Lessons from Features 1–3 — DO NOT REPEAT (most relevant: #4, #6, #8, #10, #12)
| # | Pitfall | Rule here |
|---|---|---|
| 4 | A mutation catch only `console.error`'d → spinner then nothing. | Surface EVERY error in the UI (AI failures, clipboard failures). Never swallow. |
| 6 | The filter kebab is intentionally a self-rolled portal (`@atlaskit/dropdown-menu` breaks inside `JiraTable` `overflow:hidden`). | Add `Copy WhatsApp summary` to the EXISTING hand-rolled `menuItem(...)`. Don't "restore" `@atlaskit/dropdown-menu`. |
| 8 | ADS-scan-clean ≠ working. | Run `tsc` + `vitest` + the LIVE app; paste the real output to eyeball it. |
| 10 | Stale `.git/index.lock`; `git add -A` banned. | Explicit paths; `git status` before commit; `git -C`. |
| 12 (NEW) | An LLM asked to "summarise the filter" will invent counts. | NEVER pass the raw issue list to the model for a numeric summary. Compute counts deterministically; give the model the ASSEMBLED text only for rephrasing/translation; verify digits unchanged or skip AI on numeric lines. |
| 1/3/9 | FK targets / explicit `created_by` / RLS SECURITY DEFINER. | Likely N/A (no new table in v1). Apply only if audit logging is added (Q-W3). |

## 4. Feature spec
From the filter ⋯ kebab → **Copy WhatsApp summary** opens a **preview modal**: pick template + length + language + toggles → live WhatsApp-style preview → **Copy** to clipboard. No send, no API.

**Templates:** Executive update (scope, total, overdue, at-risk, one-line blocker, explicit ask) · Team update (counts + due-soon + needs attention) · Owner follow-up (per-owner pending, oldest age, due-soon, request to update) · Meeting recap (counts + key exceptions).

**Example:**
```
Quick update on Q2 Digital Transformation:
Open: 18 · Overdue: 3 · High risk: 2 · Pending: 6 · No update 10+ days: 4
Please update pending and overdue items before the weekly review.
```

## 5. Data contract (enterprise structure)
```ts
interface WhatsAppSummaryInput {
  scope: string;                 // filter name / current view scope
  counts: { total; open; overdue; highRisk; pending; staleNoUpdate };
  topItems?: { key; summary; owner; dueState }[];  // optional exceptions
  cta?: string;
  template: 'executive' | 'team' | 'owner-followup' | 'meeting-recap';
  length: 'full' | 'short';
  language: 'en' | 'ar' | 'bilingual';
}
buildWhatsAppSummary(input): string            // PURE, deterministic, fully TDD-d
translateSummary(text, 'ar'): Promise<string>  // OPTIONAL via ai-translate-field; falls back to input on error
```

## 6. Confirmed reuse targets
| Need | Reuse | Notes |
|---|---|---|
| Counts | `useJqlResults(filter.jql_query)` + Feature 3's `jqlRowsToDashboardMetrics` | share the pure counts util; if Dashboard isn't landed, write it here and let Dashboard reuse it. |
| Clipboard + toast | `navigator.clipboard.writeText` (used in FilterKebabMenu copy-link) + `catalystToast` (`@/lib/catalystToast`) | success + error toasts. |
| Preview modal | `@atlaskit/modal-dialog` + token-styled preview | bubble is cosmetic; tokens only. |
| Pickers/toggles | `@atlaskit/select`, `radio`, `toggle`, `checkbox` | template/length/language/includes. |
| Optional AI translation | `supabase.functions.invoke('ai-translate-field', …)` (Gemini, Arabic detection) | confirm request/response in Step 1; graceful fallback. |
| Kebab entry | `FilterKebabMenu.tsx` (hand-rolled menu) | add `menuItem('Copy WhatsApp summary', …)`. |
| Flag | `ENABLE_FILTER_WHATSAPP_SUMMARY` (ADD, default off) | mirror `ENABLE_FILTER_TO_KANBAN`. |

## 7. AI decision (the differentiator)
- **Numbers are deterministic** — `buildWhatsAppSummary` renders every count from live results; the model never has authority over a number.
- **AI is optional, prose only:** Arabic translation via `ai-translate-field`; optional one-line narrative smoothing. v1 can ship **English-only, no AI** with translation as a toggle (Q-W1).
- **Graceful fallback:** edge-function error/slow → show deterministic English + subtle "translation unavailable"; never block copy.
- **Anti-fabrication guard:** if AI rephrasing touches numeric lines, verify digits unchanged vs deterministic text; else discard AI output.

## 8. Build steps (vertical — TDD, flag-gated)
1. **Discovery read** — `ai-translate-field` shape; UI i18n framework? (likely none → AI is the Arabic path); the counts util to reuse; clipboard/toast utils. Confirm Q-W1..Q-W4.
2. **Flag** `ENABLE_FILTER_WHATSAPP_SUMMARY` + test.
3. **`buildWhatsAppSummary` pure formatter** (+ heavy TDD): 4 templates × full/short; counts; zero-counts friendly message; no fabricated numbers; excludes restricted fields. **THE CORE.**
4. **Optional AI translation** wrapper + fallback + numbers-unchanged guard (skip if Q-W1 = English-only v1).
5. **Preview modal UI** pickers + toggles + live preview + Copy (clipboard + toast); errors shown in modal.
6. **Kebab entry** `Copy WhatsApp summary` → modal (derived-view scope is a follow-up; v1 = source filter).
7. **NFR + states** zero counts, AI failure fallback, >100 truncation note, copy success/failure toast, Arabic RTL preview.
8. **Close-out** ADS STRICT-clean; `tsc`; `vitest`; LIVE app generate+copy+paste-check; map to AC-W1..W4; explicit-path commit.

## 9. Acceptance criteria
- **AC-W1** counts match the live filter exactly; nothing fabricated.
- **AC-W2** clipboard-only; no API/send; no network send of user data beyond the optional translation call.
- **AC-W3** no restricted/private leak; aggregate-only fallback.
- **AC-W4** four templates; full/short; English works with no AI; Arabic/bilingual with graceful fallback.
- Plus: ADS clean (your files); `tsc` clean; Vitest green; every error surfaced.

## 10. Verification & git discipline
- `node design-governance/rules/audit.js <path>` → PASSED on each file.
- `npx tsc --noEmit` clean; `npx vitest run <new tests>` green (formatter is the test centrepiece).
- Run the app; generate each template; copy and PASTE to eyeball formatting + Arabic RTL.
- Explicit paths only; `git status` before commit; `git -C`.

## 11. Open questions for JK (Step 1)
- **Q-W1** English-only deterministic v1, or include Arabic/bilingual via `ai-translate-field` now? *(Rec: English first, Arabic toggle same PR if the function's ready.)*
- **Q-W2** UI i18n framework for Arabic, or AI translation only? *(Confirm in discovery.)*
- **Q-W3** audit-log "summary copied" or ephemeral? *(Rec: ephemeral v1.)*
- **Q-W4** inside derived views, reflect that view's scope or always the source filter? *(Rec: source filter v1.)*

Don't build past Step 1 until Q-W1/Q-W2 are answered — they decide whether the AI layer exists in v1.
