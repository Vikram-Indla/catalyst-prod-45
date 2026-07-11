# CAT-IDEATION-DISCOVERY-20260709-001

**Type**: Discovery/research only — no implementation performed or authorized.

**⚠️ DESIGN OF RECORD**: `03_GREENFIELD_REBUILD_BLUEPRINT.md` — per Vikram's 2026-07-09 directive, the existing Ideation module is to be **wiped entirely** and rebuilt clean-slate with zero carryover of its UI, concepts, object model, or data structures. The blueprint designs fresh from Catalyst platform primitives + the external benchmark, and contains the legacy decommission inventory (§12).

**Historical/evidence artifact**: `02_CANONICAL_DISCOVERY.md` — the original discovery dossier (its "Revamp Existing" advisory is **superseded**). Still valid as: platform-seam evidence map (hierarchy, BR, STRATA, workflow runtime, AI gateway, notifications, canonical components) and the external product benchmark matrix.

**Headline findings**
1. Ideation already exists (`/ideation/*`, `ph_ideas` + 8 satellite tables + 9 views) — production-wired but ~40% façade.
2. Conversion targets `ph_requests`, not the canonical Level-0 `business_requests` (MIM-N) — the keystone defect.
3. Strategy↔BR linkage is unmodeled platform-wide; Idea should carry it (`strategy_element_id` → STRATA, `converted_business_request_id` → BR).
4. All AI primitives for the Idea→BR Copilot exist (LLM gateway, ai-similar-items, Caty personas, voice, docintel); the missing piece is a governed suggestion-lifecycle layer (`ph_idea_ai_suggestions`).
5. **Advisory: REVAMP EXISTING** — 10 ordered revamp tracks listed in §K.

**Next step**: review dossier → if accepted, run `activate feature` for the first revamp slice (conversion retarget) to produce a Plan Lock. No code before Plan Lock.
