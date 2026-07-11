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
