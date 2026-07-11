# Catalyst Knowledge Platform -- Acceptance Criteria (Master Contract)

## Purpose

This document is the acceptance contract for evolving Catalyst Doc Intel
into the Catalyst Knowledge Platform.

## Phase Gates

1.  Discovery completed before implementation.
2.  Delta-only implementation.
3.  Evidence pack required before phase closure.

## Capability Inventory (Condensed Master List)

### 1. Discovery

-   Discover all existing Doc Intel architecture.
-   Map routes, UI, APIs, Edge Functions.
-   Map Supabase schema.
-   Map ingestion pipeline.
-   Map retrieval pipeline.
-   Map security/RLS.
-   Produce capability matrix.

### 2. Knowledge Acquisition

-   PDF
-   Scanned PDF
-   Word
-   Excel
-   Images
-   Tables
-   Arabic
-   English
-   Mixed-language documents

### 3. OCR & Extraction

-   Native text extraction
-   OCR fallback
-   Image extraction
-   Table reconstruction
-   Confidence scoring
-   Page segmentation
-   Section detection

### 4. Arabic

-   Preserve original Arabic
-   Arabic Q&A
-   English translation
-   Side-by-side evidence

### 5. Knowledge Compilation

-   Normalize
-   Deduplicate
-   Entity resolution
-   Relationship discovery
-   Conflict detection
-   Versioning
-   Lineage
-   Provenance

### 6. Knowledge Integration

-   Link to Business Requests
-   Epics
-   Features
-   Stories
-   Releases
-   Changes
-   Test Cases
-   Defects
-   Documents

### 7. Retrieval

-   Hybrid retrieval
-   Permission-aware
-   Citations
-   Freshness
-   Confidence
-   "Not Found" when evidence is insufficient

### 8. Artifact Generation

-   Epic
-   Story
-   BRD
-   Business Process
-   Acceptance Criteria
-   Test Cases
-   Release Notes
-   Traceability Matrix

### 9. Knowledge Health

-   Coverage
-   Freshness
-   Confidence
-   Failed OCR
-   Failed Compilation
-   Pending Review
-   Knowledge Debt
-   Sync Status

### 10. Security

-   RLS
-   Tenant isolation
-   Audit
-   Export control
-   Approval workflow

### 11. Production

-   Tests
-   Monitoring
-   Retry
-   Rollback
-   CI/CD

## Final Acceptance

The platform passes only when: - Discovery is complete. - Existing
capabilities are reused. - Missing capabilities are implemented. - Folio
is the entry point. - Gemini powers OCR/Vision where required. - Every
answer is evidence-backed. - Every generated artifact is traceable. -
Knowledge remains continuously synchronized.
