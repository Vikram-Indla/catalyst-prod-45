# 05 — Scorecard

Scoring is **capability completeness against the enterprise reservoir bar**, applying the strict
PASS gate (architecture+runtime+UI+security+evidence+operable+production+**tested**). Because
**zero automated tests exist**, no area reaches a true PASS; scores reflect how much of the
enterprise capability is actually built and running.

| # | Area | Score | Verdict | One-line basis |
|---|---|---:|---|---|
| 1 | **Doc Intel (documents)** | **75%** | PARTIAL (strong) | Full working pipeline + UI + RLS + live data; untested, not prod-hardened |
| 2 | **Knowledge Reservoir (all objects)** | **10%** | FAILED | 1 of 21 object families indexed (documents only) |
| 3 | **OKF** | **20%** | PARTIAL (low) | Citation/provenance/confidence/versioning for documents; no OKF format/generator/compiler/relationships |
| 4 | **Knowledge Compiler** | **5%** | NOT FOUND | No compile stage; facts-review is the only human gate |
| 5 | **Knowledge Sync** | **10%** | FAILED | Inline per-upload only; 0 cron; no queue/replay/stale/rebuild |
| 6 | **Knowledge Health** | **30%** | PARTIAL | 2 surfaces, ~5/17 metrics |
| 7 | **OCR & Vision** | **45%** | PARTIAL | PDF/DOCX/tables/confidence PASS; vision OCR unexercised; Excel/charts/RTL absent |
| 8 | **Retrieval** | **70%** | PASS (documents) | Hybrid RRF + metadata + permission-before + citations; no rerank/graph/freshness |
| 9 | **Knowledge Graph** | **0%** | NOT FOUND | Nothing |
| 10 | **AI** | **65%** | PARTIAL (strong) | Provider abstraction + structured + streaming + generators; Qwen dormant, prompts unmanaged, no tool-calling |
| 11 | **Security** | **55%** | PARTIAL (strong isolation) | Project-scoped RLS + permission-before-retrieval; no export/redaction/approval/full-audit |
| 12 | **UI (enterprise)** | **35%** | PARTIAL | Document UI strong; graph/explorer/sync/compile/approval/overview UIs absent |
| 13 | **Production Readiness** | **15%** | FAILED | 0 tests, broken CI, MCP-only deploy, no alerts/rollback |

## Rolled-up scores

| Pillar | % |
|---|---:|
| Enterprise Readiness | **33%** |
| Knowledge Reservoir | **10%** |
| OKF | **20%** |
| Knowledge Compiler | **5%** |
| Knowledge Sync | **10%** |
| Knowledge Health | **30%** |
| Knowledge Graph | **0%** |
| OCR | **45%** |
| Retrieval | **70%** |
| Security | **55%** |
| AI | **65%** |
| Production | **15%** |
| **Overall** | **~33%** |

*Overall = unweighted mean of the 13 area scores (33.8%), rounded to ~33%. A business-weighted
mean (weighting the four CRITICAL reservoir pillars — indexing/OKF/compiler/sync — more heavily)
lands lower, ~25–28%.*

## Interpretation band

```
0–20%   Concept / not started
21–40%  Vertical prototype  ◄── Catalyst is HERE (~33%)
41–60%  Feature-complete vertical, enterprise-incomplete
61–80%  Enterprise-capable, hardening needed
81–100% Production enterprise reservoir
```

## The strict-gate reading

Under the audit's own rule ("PASS only if … tested"), **the honest count is:**
- **True PASS: 0 areas** (nothing is tested).
- **Functionally strong but ungated: 3** (Doc Intel, Retrieval, AI).
- **PARTIAL: 4** (OKF, Health, OCR, Security, UI → 5).
- **FAILED / NOT FOUND: 5** (Reservoir, Compiler, Sync, Graph, Production).

**Conclusion: Catalyst is a ~33% enterprise reservoir — i.e., a strong Document RAG vertical,
not an Enterprise Knowledge Reservoir.**
