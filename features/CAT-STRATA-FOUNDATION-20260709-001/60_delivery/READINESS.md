# READINESS — research phase (Deep Discovery; NOT a build-handoff score)

## Mechanical checks (run 2026-07-09, bash/awk against TRACE.csv + registers)

```
awk -F, 'NR>1 && ($2==""){print "ORPHAN: "$1} END{print "rows="NR-1}' TRACE.csv   → rows=21, 0 orphans
awk -F, 'NR>1 && ($4==""||$4==0){print "NO-AC: "$1}' TRACE.csv                    → 0 offenders
awk -F, 'NR>1{print $1}' TRACE.csv | sort | uniq -d                               → 0 duplicate REQ IDs
grep -c "REQ-0" REQUIREMENTS.md                                                    → 21 (matches TRACE rows)
```

All checks PASS. Every REQ traces to SRC-001 and/or repo-evidence source (SRC-A/B/C) or a registered CON/ASM; every REQ has ≥1 AC; no duplicates.

## Status vs gates

- Gate R1: approved (user consent 2026-07-09).
- Gate R2: **presented herewith** — 6 conflicts registered, 4 need Vikram decisions (CON-001/002/003/006); 8 assumptions logged.
- Gate R3: NOT frozen — REQ-002/016/017 are decision-gated; three verify-first REQs (007–009) await the ASM-002 probe.
- Gate R4: N/A this phase (research-only contract; build handoff readiness will be scored after Plan Lock + waves).

## Readiness verdict

**Research baseline: COMPLETE and cold-start-capable** (see 90_handoff/HANDOFF.md Q&A). **Build readiness: controlled-build-planning band** — blocked only on the four escalated decisions and the two build-phase probes (live-DB drift ASM-001, execution_links shape ASM-002). No code/DB changes were made this phase.

## v1.1 re-run (2026-07-09, resume session, post-Gate-R2 decisions)

Gate R2 decisions recorded in `00_admin/DECISIONS.md` (CON-001 full rename; CON-002 decommission+migrate; CON-003 strata-standalone + /strata IA; CON-006 delete Astryx). ASM-002 verified from repo evidence; CON-005 narrowed to REQ-007 only. Register expanded to REQ-001..023 (REQ-022/023 new from CON-002; contract amendment A1).

```
python3 checks against TRACE.csv + REQUIREMENTS.md:
rows=23  csv_ids=23  md_ids=23
orphan check (every REQ has ≥1 SRC/RES/ASM/CON source)  → 0 offenders
AC check (AC_COUNT ≥ 1)                                  → 0 offenders
csv ↔ REQUIREMENTS.md ID sync                            → exact match
state-tag check (to-be | as-is | as-is-cleanup)          → 0 offenders
gating check (no pending-decision / verify-first left)   → 0 offenders
dedup check                                              → 0 duplicate IDs
RESULT: ALL CHECKS PASS
```

Remaining open assumptions for the build session: ASM-001 (live drift probe), ASM-003..008. Gate R3 freeze presented to user.
