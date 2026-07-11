# 02 — Canonical Discovery: Doc Intel → Catalyst Knowledge Platform
Date: 2026-07-07. Lanes: A frontend, B edge-fn pipeline, C live cyij DB, D docs — plus origin/main
`docs/doc-intel-audit/reservoir-acceptance-audit/` (commit 7fde4c7e9, 6-doc audit, verdict ~33%
vs the broader enterprise-reservoir bar).

## Canonical substrate (DECIDED by Vikram 2026-07-07 — do not fork)
- **Schema**: `ai_*` family, 16 tables on cyij (documents/versions/pages/blocks/chunks/embeddings/
  images/tables/jobs/audit_events/extraction_issues/requirement_facts/generated_artifacts/
  artifact_citations/agent_runs/agent_prompts). kb_* = deprecated (0 embeddings), do not build on.
- **RPCs**: 9 `docintel_*` incl. `docintel_hybrid_search` (RRF 0.6 vec/0.4 FTS, arabic regconfig,
  membership check in SECURITY DEFINER), `docintel_match_facts` (dead — nothing embeds
  requirement_fact chunks), `docintel_advance_status` (CAS), `docintel_stamp_latency`.
- **Edge fns**: `docintel-ingest` → fan-out `docintel-analyze` (8-page batches, native-first,
  Gemini vision OCR fallback, AR preserved verbatim + translate-label agent) → inline
  `_shared/embed_stage.ts` (layout-aware chunks → gemini-embedding-001 @1536) → `docintel-generate`
  (grounded artifacts + SSE streaming + zero-evidence truthful short-circuit + deterministic
  grounding score + citations).
- **Provider chain** (`_shared/llm.ts`): **Gemini primary** (gemini-2.5-flash all gen/vision;
  gemini-embedding-001 all embeddings, no fallback) → Anthropic failover → Qwen dormant.
  ✅ AC "Gemini powers OCR/Vision" already satisfied.
- **Frontend**: `/doc-intelligence/*` in `src/modules/docintel/` (Documents/Upload/Workspace pages;
  Evidence/Document/Facts/Artifacts/Traceability tabs; PromoteArtifactModal → ph_work_items;
  RTL + Arabic font stack throughout). Folio sidebar entry (WikiSidebar "Document Intelligence",
  CatalystShell isWikiRoute) ✅ AC "Folio is the entry point" satisfied.
- **origin/main extras not in local checkout**: DocintelHealthPage (/doc-intelligence/health,
  commit 2c40160dc) + reservoir-acceptance-audit docs (7fde4c7e9). Local main diverged:
  local +1 (b98500ef3 breadcrumb), origin +5. Delta work happens in worktree from origin/main.
- **Live data (cyij)**: 2 docs ready (incl. real 24-page Arabic BRD), 25 pages extracted
  (native, ocr_conf ~0.97), 639 blocks 100% bilingual, 365 embeddings (195 en/170 ar),
  2 artifacts (brd+epic, verified, grounding 1.0), 78 citations, 631 audit events, 11/11 agent
  runs ok. ai_requirement_facts=0 (never run), ai_document_jobs=0, no docintel cron.

## Capability Matrix vs Acceptance Contract (01_OBJECTIVE.md)

Legend: ✅ EXISTS · 🟡 PARTIAL · ❌ MISSING. Evidence = lane reports (02a/02b + agent transcripts)
and origin audit 03_CAPABILITY_MATRIX.md.

### §2 Knowledge Acquisition
| Item | Status | Evidence |
|---|---|---|
| PDF | ✅ | docintel-ingest unpdf; live 24-page BRD ready |
| Scanned PDF | 🟡 | OCR path built (pdf-lib slice → Gemini vision) but UNEXERCISED at runtime |
| Word | 🟡 | DOCX via mammoth, collapses to 1 logical page; accepted in upload UI |
| Excel | ❌ | `unsupported mime_type` (docintel-analyze:1073) |
| Images (standalone) | ❌ | not accepted; only in-PDF images described |
| Tables | 🟡 | structured on OCR/DOCX path → ai_document_tables; native path = labelled blocks only |
| Arabic / English / Mixed | ✅ | detected_language ar\|en\|mixed; bilingual blocks live |

### §3 OCR & Extraction
| Item | Status |
|---|---|
| Native text extraction | ✅ unpdf + mammoth |
| OCR fallback | ✅ built (<40 chars → vision), unproven live |
| Image extraction | 🟡 described, region_path never written (no crop) |
| Table reconstruction | 🟡 (see above) |
| Confidence scoring | ✅ block/table/image + page min + <0.6 → ai_extraction_issues |
| Page segmentation | ✅ per-page rows/status/retry |
| Section detection | ✅ heading_section chunks (but section_path NULL in live samples — bug) |

### §4 Arabic
| Item | Status |
|---|---|
| Preserve original Arabic | ✅ AR = source of truth, never LLM-re-emitted (native path) |
| Arabic Q&A | ❌ no Q&A surface at all |
| English translation | ✅ translate-label agent; 100% bilingual blocks live |
| Side-by-side evidence | ✅ EvidenceViewer + TranslatedDocumentView side-by-side mode |

### §5 Knowledge Compilation
| Item | Status |
|---|---|
| Normalize | 🟡 typed blocks/chunks; no cross-doc normalization |
| Deduplicate | 🟡 content_hash stored doc+chunk; NO skip-if-duplicate logic |
| Entity resolution | ❌ |
| Relationship discovery | ❌ (only artifact document_ids[]) |
| Conflict detection | ❌ |
| Versioning | 🟡 ai_document_versions v1 written; no re-upload/v2 flow |
| Lineage / Provenance | ✅ block→chunk→embedding→citation chain + extraction_source/provider/model |

### §6 Knowledge Integration
| Item | Status |
|---|---|
| Link to Epics/Stories | 🟡 PromoteArtifactModal (epic/story → ph_work_items only) |
| BRs/Features/Releases/Changes/Tests/Defects/Documents | ❌ for docintel docs (kb_document_links is Folio-pages-only) |

### §7 Retrieval
| Item | Status |
|---|---|
| Hybrid retrieval | ✅ docintel_hybrid_search RRF (server-side only) |
| Permission-aware | ✅ ph_project_members before retrieval + RLS + storage RLS |
| Citations | ✅ [E n] chips → CatalystDrawer quoted evidence |
| Freshness | ❌ no recency signal in RPC or answers |
| Confidence | ✅ grounding score + per-citation confidence (⚠ live values ~0.01 mis-scaled) |
| "Not Found" on insufficient evidence | ✅ zero-evidence truthful short-circuit, no LLM spend |
| **Free-form Q&A (implied by "every answer")** | ❌ no ask fn/UI; embeddings have zero conversational consumer |

### §8 Artifact Generation
| Type | Status |
|---|---|
| Epic / Story / BRD | ✅ (+ summary_en/ar, gap_analysis, open_questions) |
| Business Process | ❌ |
| Acceptance Criteria | ❌ |
| Test Cases | ❌ (exists only on TestHub track, not doc-grounded) |
| Release Notes | ❌ |
| Traceability Matrix | 🟡 schema CHECK allows, not generatable; UI view exists |

### §9 Knowledge Health (origin DocintelHealthPage baseline)
| Item | Status |
|---|---|
| Coverage | 🟡 ready/total docs |
| Freshness | 🟡 last activity + avg pipeline time |
| Confidence | 🟡 avg grounding |
| Failed OCR / Failed compilation | 🟡 failed-docs JiraTable + open issues count |
| Pending review | 🟡 needs_review docs listed |
| Knowledge Debt | ❌ |
| Sync Status | ❌ (no sync engine) |

### §10 Security
| Item | Status |
|---|---|
| RLS / Tenant isolation | ✅ all 16 tables project-scoped |
| Audit | ✅ ai_docintel_audit_events (631 live) + ai_usage_log + ai_agent_runs |
| Export control | ❌ exportDocument.ts client-side, ungated, unaudited |
| Approval workflow | 🟡 facts Confirm/Reject + artifact draft/verified/rejected/promoted statuses; no approve UI beyond facts |

### §11 Production
| Item | Status |
|---|---|
| Tests | ❌ zero automated tests on docintel |
| Monitoring | 🟡 latency_ms stamps + agent runs; no alerts |
| Retry | ✅ LLM backoff+failover, page/segment/embed retries; 🟡 no queue poller (jobs table unused) |
| Rollback | ❌ MCP-only deploys |
| CI/CD | 🟡 repo CI exists; no docintel coverage |

## Known live bugs found in discovery
1. Citation confidence ~0.01 vs grounding 1.0 — mis-scaled write.
2. chunk.section_path NULL in live samples despite embed_stage building section paths.
3. docintel_match_facts dead (no requirement_fact embeddings written).
4. ai_agent_prompts registry placeholder — runtime uses hardcoded prompts, prompt_id provenance untruthful.
