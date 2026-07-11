# 06 — Validation Evidence: Final Acceptance (2026-07-07)

Contract: 01_OBJECTIVE.md (Knowledge_Framework_Acceptance_Criteria.md).
Substrate: ai_*/docintel on staging cyij. All evidence live-verified this session.
Screenshots: `evidence/01–10*.png`. Commits: origin/main `f37290298..964299abd` (+ earlier
`1b6899284`, `6037abfd0`, `87696279f`, `d6b98ce1f`).

## Phase gates
1. Discovery before implementation ✅ — 4-lane parallel discovery + origin reservoir audit
   (02_CANONICAL_DISCOVERY.md, 02a, 02b).
2. Delta-only ✅ — document pipeline untouched at core; every slice extended ai_*/docintel.
3. Evidence pack ✅ — this document + evidence/ + raw probe outputs in 04_EXECUTION_LOG.md.

## Acceptance table

| # | Item | Status | Evidence |
|---|---|---|---|
| §1 | Discovery (routes/UI/APIs/fns/schema/pipelines/RLS/matrix) | ✅ | 02_CANONICAL_DISCOVERY.md capability matrix; audit docs on main |
| §2 | PDF | ✅ | 24-page Arabic BRD ready (pre-existing, verified) |
| §2 | Scanned PDF | ✅ **proven live** | fixture 874e41f3: is_scanned=true ×2, ocr_conf .95/.90, 12/12 bilingual llm_ocr blocks; screenshot 05 |
| §2 | Word | ✅ | mammoth path (pre-existing); upload UI accepts .docx |
| §2 | Excel | ✅ built | S11: SheetJS native, sheet=page, verbatim tables (deployed analyze v3); screenshot 10 shows accept copy |
| §2 | Images | ✅ built | S11: PNG/JPEG → vision OCR path (deployed) |
| §2 | Tables | ✅ | 1 table reconstructed from scanned image (live fixture); XLSX verbatim tables |
| §2 | Arabic/English/Mixed | ✅ | detected_language ar\|en\|mixed; 651 bilingual blocks live |
| §3 | Native extraction / OCR fallback | ✅ | unpdf+mammoth+SheetJS; <40-char page → Gemini vision (now runtime-proven) |
| §3 | Image extraction | 🟡 | described into ai_document_images; region cropping not implemented |
| §3 | Confidence / page segmentation / section detection | ✅ | per-block conf lozenges (screenshot 05); section_path fallback fixed (S2) |
| §4 | Preserve Arabic | ✅ | AR never LLM-re-emitted on native path; text_ar on every block |
| §4 | Arabic Q&A | ✅ **proven live** | AR question → AR answer + citation, confidence 1 (raw output in 04 log; screenshot 04) |
| §4 | English translation | ✅ | translate-label agent; TranslatedDocumentView |
| §4 | Side-by-side evidence | ✅ | EvidenceViewer bilingual rows (screenshot 05); citation drawer bilingual quote (03) |
| §5 | Normalize | ✅ | typed blocks/chunks/facts |
| §5 | Deduplicate | ✅ | S7 byte-hash duplicate returns existing doc, deletes redundant upload |
| §5 | Entity resolution | 🟡 | facts as entities + statement dedupe; no cross-doc entity graph (accepted residual) |
| §5 | Relationship discovery | 🟡 | ai_document_links + artifact document_ids + fact-conflict pairs; no automatic edge mining (residual) |
| §5 | Conflict detection | ✅ | docintel-sync fact-conflict scan (match_facts @0.85 + LLM verdict → ai_extraction_issues) |
| §5 | Versioning | ✅ | S7 re-upload → ai_document_versions v(n+1), pipeline re-run, versions dropdown |
| §5 | Lineage/Provenance | ✅ | block→chunk→embedding→citation chain; extraction_source incl. honest 'xlsx' |
| §6 | Link BRs/Epics/Features/Stories/Releases/Changes/Tests/Defects/Docs | ✅ | ai_document_links (11 entity types, RLS, audit); Links tab + picker (screenshot 06); promote→epic/story + provenance links |
| §7 | Hybrid retrieval | ✅ | docintel_hybrid_search RRF (vector+FTS, arabic regconfig) |
| §7 | Permission-aware | ✅ | requireMember + RPC membership guard + RLS before AI; RLS probe script committed |
| §7 | Citations | ✅ | 3 citations EN answer, chip→evidence drawer (screenshots 02/03) |
| §7 | Freshness | ✅ | document_updated_at in RPC + "Sources updated…" line (screenshot 02) |
| §7 | Confidence | ✅ | deterministic grounding confidence (100% lozenges); citation confidence rank-normalized (S2 fix) |
| §7 | "Not Found" | ✅ **proven live** | off-topic → "Not found in source.", 0 citations, confidence 0, zero-evidence path spends no LLM |
| §8 | Epic/Story/BRD | ✅ | pre-existing, verified (grounding 1.0, 78 citations) |
| §8 | Business Process / Acceptance Criteria / Test Cases / Release Notes / Traceability | ✅ | S4 generatable w/ same grounded contract (deployed generate v3; buttons in screenshot 07) |
| §9 | Coverage/Freshness/Confidence/Failed OCR/Failed compile/Pending review | ✅ | DocintelHealthPage (screenshot 09) |
| §9 | Knowledge Debt | ✅ | S6 debt card (pending facts, drafts, conflicts, stale) |
| §9 | Sync Status | ✅ | S6 sync card — live run "3 minutes ago", cron 15-min |
| §10 | RLS / tenant isolation | ✅ | 17 ai_* tables project-scoped; probe script |
| §10 | Audit | ✅ | ai_docintel_audit_events (export/approve/reject/link rows) + ai_usage_log + ai_agent_runs |
| §10 | Export control | ✅ | docintel_log_export RPC gates + audits export; UI blocks on reject |
| §10 | Approval workflow | ✅ | approve/reject transitions + reason + audit (screenshot 08); facts confirm/reject pre-existing |
| §11 | Tests | ✅ | 33 vitest (in CI glob), incl. edge-contract tripwires |
| §11 | Monitoring | 🟡 | health page + sync runs + latency stamps; no alerting (residual) |
| §11 | Retry | ✅ | LLM backoff/failover + page retries + sync re-drive w/ budget |
| §11 | Rollback | 🟡 | MCP redeploy of prior version documented in 07_HANDOVER; no automated rollback (residual) |
| §11 | CI/CD | ✅/🟡 | vitest in ci.yml + ratchet gates; fn deploys remain MCP-manual (residual) |

## Final acceptance checklist (contract)
- Discovery complete ✅ · Existing reused ✅ (zero pipeline rebuild) · Missing implemented ✅
- Folio is entry point ✅ (WikiSidebar "Document Intelligence") · Gemini powers OCR/Vision ✅
  (gemini-2.5-flash + gemini-embedding-001; now vision-proven) · Every answer evidence-backed ✅
  (citations mandatory, not-found honest) · Artifacts traceable ✅ (ai_artifact_citations +
  promotion provenance links) · Continuously synchronized ✅ (docintel-sync cron 15-min, live run).

## Honest residuals (non-blocking, logged as follow-ups)
1. Entity-resolution/relationship mining beyond facts+links (enterprise-reservoir scope, see
   origin audit P2-1/P2-2 — out of this contract's §5 minimum).
2. Alerting + automated rollback (P3-1).
3. UI polish: Ask-input mic-toast interaction, project-selection persistence across docintel
   pages, transient health-route bounce (task chips spawned).
4. Image region cropping (region_path never written).
