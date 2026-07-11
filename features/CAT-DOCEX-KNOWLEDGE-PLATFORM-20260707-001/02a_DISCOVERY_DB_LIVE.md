# Discovery Lane C — Live cyij DB probe (2026-07-07)

Verified target: cyijbdeuehohvhnsywig (staging). SELECT-only.

## Core reservoir: ai_* family (16 tables)

| Table | Rows | Notes |
|---|---|---|
| ai_documents | 2 | slug, source_language, status, status_detail, latency_ms jsonb, content_hash |
| ai_document_versions | 0 | unused |
| ai_document_pages | 25 | is_scanned, render_path, ocr_confidence (~0.97 avg), status |
| ai_document_blocks | 639 | kind, bbox, lang, confidence, extraction_source, provider/model, **text_ar + text_en 100% bilingual**, table_id, image_id |
| ai_document_chunks | 365 | scope (heading_section 340 / page 25), lang, block_ids[], section_path (null in samples!) |
| ai_document_embeddings | 365 | vector dim 1536, model gemini-embedding-001, 195 en / 170 ar |
| ai_document_images | 0 | no image data yet |
| ai_document_tables | 0 | no table data yet |
| ai_document_jobs | 0 | queue table unused — pipeline synchronous |
| ai_docintel_audit_events | 631 | active audit trail |
| ai_extraction_issues | 0 | unused |
| ai_requirement_facts | 0 | **fact extraction never produced output** |
| ai_generated_artifacts | 2 | brd + epic, verified, grounding_score=1, not promoted |
| ai_artifact_citations | 78 | claim_path/claim_text/quoted_text; **confidence ≈ 0.01 — mis-scaled** |
| ai_agent_runs | 11 | all ok; analyze/translate/embed/brd/epic; ~85K in / 90K out tokens |
| ai_agent_prompts | 10 | v1 active: brd, critic, epic, intent, ocr_validation, retrieval, story, structuring, summary, translation |

kb_* track (22 tables): DORMANT — kb_embeddings=0, kb_query_log=0. ai_* is the live reservoir.

## RPCs (9 docintel)
docintel_hybrid_search, docintel_match_facts, docintel_advance_status, docintel_audit,
docintel_generate_slug, docintel_slugify, docintel_stamp_latency, docintel_touch_updated_at,
docintel_is_project_member.

## RLS
All 16 tables: project tables gate on ph_project_members; child tables via EXISTS parent
ai_documents; citations via parent artifact. ai_agent_prompts SELECT=true (open read).
No DELETE policies on family.

## Storage
docintel-documents bucket private, 2 objects ~2.44MB. Adjacent: ai-assist*, brd-attachments,
efd-documents, wiki-docs.

## Cron
6 jobs, none docintel. **No background sync/retry worker.**

## Edge functions (ACTIVE)
docintel-ingest (v1), docintel-analyze (v1), docintel-generate (v1) — verify_jwt=true.
Adjacent: docex-import, folio-ai-search, ai-generate-test-artefacts, ai-tm-assist.

## Documents live
1. loop-verification-fixture (PDF 35KB, 1 page, ready)
2. raw-materials-brd-arabic-real (PDF 2.4MB, 24 pages, ready) — real Arabic BRD
All 25 pages extracted, native_pdf, none scanned. source_language NULL on both docs.

## Live gaps found by probe
1. ai_requirement_facts = 0 (facts stage dead or never wired)
2. Citation confidence ≈ 0.01 vs grounding_score=1 (mis-scale)
3. No cron/background sync; ai_document_jobs unused
4. section_path null on sampled chunks
5. Tables/images extraction untested (0 rows — maybe source lacks them)
6. ai_document_versions unused (no versioning exercised)
7. source_language null on documents
8. No retrieval/query log to prove hybrid search used
