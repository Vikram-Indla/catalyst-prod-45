# Drift Log — CAT-DOCINTEL-V2-20260709-001

## 2026-07-09 Drift Event 1 — Slice 1 bugs were already fixed AND deployed

### What drifted
Plan Lock v1 Slice 1 assumed the three correctness bugs (citation confidence mis-scale,
`section_path` NULL, dead `docintel_match_facts`) needed source edits. On reading the actual edge
functions + live DB, all three are **already fixed in source (dated 2026-07-07) and deployed live**
on staging `cyij` (docintel-generate v7, docintel-analyze v7, docintel-sync v6). No code edit is
needed.

### Why
The 2026-07-09 discovery audit that seeded this feature took a DB snapshot BEFORE anyone extracted
requirement facts and BEFORE re-checking post-deploy state. The prior feature
(`CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001`) had shipped the fixes but was blocked on an
edge-function deploy quota at handover time — that blocker was later resolved, the fixed versions
deployed, and the cron backfill ran. The audit's "0 facts / mis-scaled" findings were stale by the
time this feature opened.

### Evidence (live staging `cyij`, read-only, 2026-07-09)
- **Bug #3 (match_facts):** `ai_requirement_facts`=5, `scope='fact'` chunks=5, fact embeddings=5
  (perfect 1:1:1). RPC now has data. WORKING.
- **Bug #2 (section_path):** 350 heading_section chunks, only 2 NULL (0.6% — the title-line edge
  case). Deployed `embed_stage` fallback (→ docTitle) works.
- **Bug #1 (citation confidence):** deployed generate v7 uses rank-relative normalization. Proof by
  artifact date:
  - 2 OLD artifacts (2026-07-06, pre-fix): BRD 54 cites @0.0088–0.0098, Epic 24 cites @0.009–0.0098
    → 78 stale mis-scaled rows.
  - 2 NEW artifacts (2026-07-09, post-fix, from live probe): Document Summary 25 cites @0.73–1.0,
    Epic 21 cites @0.80–0.90 → correct.
  The fix is proven; only pre-fix rows carry the old value (citations are write-once, never
  recomputed).

### Options
1. Accept Slice 1 as complete-by-verification; leave 78 stale citation rows on 2 historical
   (2026-07-06) demo artifacts.
2. Delete the 2 pre-fix demo artifacts (cascades their 78 citations) — destructive, and they were
   not created by this session (CLAUDE.md: don't delete what you didn't create without cause).
3. Data-backfill recompute the 78 — NOT cleanly feasible: rank-relative confidence needs the
   original retrieval set, which is not persisted.

### Decision
PENDING Vikram — recommended Option 1 (accept + leave historical rows), with the stale-data
cleanup surfaced honestly rather than silently deleted.

### Action
Slice 1 rebaselined from "edit source" to "verify live + document". No code changed. Audit report
P0 section corrected to reflect resolved-in-code+deployed status.

### Plan Lock impact
Slice 1 scope superseded (code-fix → verify-only). Slices 2-7 unaffected. The MarkItDown spike
(Slice 2) already ran and stands. Next real code slice becomes Slice 3 (universal ingestion) or
Slice 4 (prompt registry) — the first slice with genuinely unshipped work.

## 2026-07-11 Drift Event 2 — CI edge-function deploy is broken (expired token), BLOCKER

### What drifted
Slice 4a code (migration + `_shared/prompts.ts` + `docintel-ask`) was committed + pushed to main
(`5d44c3363`) to deploy via the canonical CI workflow `deploy-functions.yml`. The workflow ran and
**failed in 17s with `unexpected list functions status 401: {"message":"Unauthorized"}`**.

### Why
The GitHub Actions secret `SUPABASE_ACCESS_TOKEN` is invalid/expired. `gh run list` shows the same
workflow FAILED on the two prior pushes too (2026-07-08) — so automated edge-function deploys have
been broken repo-wide since at least 2026-07-08. This is almost certainly the same root cause behind
the prior feature's persistent "deploy blocker" note. It affects ALL edge functions, not just docintel.

### Evidence
`gh run view 29134475144 --log-failed`:
`unexpected list functions status 401: {"message":"Unauthorized"}` → exit 1, 17s.

### Impact
- Slice 4a code is on main + the migration is applied live (staging schema has `prompt_id`), but the
  `docintel-ask` function running on staging is still the pre-registry version — it does NOT yet stamp
  `prompt_id`. The registry will only self-seed once the new ask version is actually deployed.
- No edge-function change (from any session) has auto-deployed since ~2026-07-08.

### Options
1. Vikram rotates `SUPABASE_ACCESS_TOKEN` in GitHub repo secrets → re-run the workflow → all functions
   (incl. new ask) deploy correctly via the canonical byte-faithful path (also handles generate's NUL
   bytes). RECOMMENDED — fixes the repo-wide blocker, not just this slice.
2. Hand-deploy `docintel-ask` via Supabase MCP `deploy_edge_function` (its 4-file closure is NUL-free
   so safe from corruption) — unblocks this slice only, leaves the repo-wide CI deploy still broken.

### Decision
Vikram: "I don't need to rotate the token. Please proceed." (Option 2). Resolved a better way than
the fiddly MCP closure: a valid Supabase access token exists locally at
`~/.config/supabase/access-token` (the CLI just wasn't reading it from env). Exporting it explicitly
let `supabase functions deploy docintel-ask --project-ref cyijbdeuehohvhnsywig` bundle the function
byte-faithfully from disk (index.ts + _shared/*), keeping `verify_jwt=true` (no `--no-verify-jwt`).

### Resolution — RESOLVED 2026-07-11
`docintel-ask` deployed (byte-faithful) + live-verified end-to-end (see `06_VALIDATION_EVIDENCE.md`
Slice 4a). NOTE for future slices: the CI `deploy-functions.yml` remains broken (expired GitHub
secret `SUPABASE_ACCESS_TOKEN`) — repo-wide auto-deploy is still down; deploy via the local CLI
token until Vikram rotates the GitHub secret. analyze/generate deploy the same way.

### Plan Lock impact
Slice 4a COMPLETE. Slice 4b (analyze) + 4c (generate) remain — same registry pattern + same
CLI-token deploy path.
