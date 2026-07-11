# CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001

**Mission**: Transform Doc Intel (Folio) into the Catalyst Knowledge Platform per the acceptance
contract at `/Users/vikramindla/Downloads/Knowledge_Framework_Acceptance_Criteria.md` (copied to
`01_OBJECTIVE.md`).

**Mode**: /loop autonomous — discovery first, delta-only build, evidence pack per phase.

**Related prior features** (read before assuming anything missing):
- `CAT-DOCEX-RAG-AGENTS-20260706-001` — built the Knowledge Reservoir (ai_*/docintel_* family,
  14 tables, 9 RPCs, docintel-documents bucket, 365 embeddings dim1536, brd+epic artifacts,
  RLS via ph_project_members). kb_* is a DEAD older track.
- `CAT-DOCEX-DB-COEDIT-20260705-001` — Docex database co-edit surface.

**Hard rules**: discovery before code; no duplicate architecture; canonical Catalyst UI only;
ADS tokens only; staging cyij only (prod lmqw untouched); Gemini as OCR/Vision provider
abstraction; Arabic source preserved.

**Session start**: read 01, 02, 03, 07, 08, 09 in order.
