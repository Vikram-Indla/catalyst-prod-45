# B6 — AI Insight Model

> STATUS: 🟢 DRAFT. Factual only. No fabrication.

## Hard rules
- Use ONLY Catalyst data already computed in the report (coverage, exec, defects, incidents, mismatches).
- Cite the metric behind every claim (e.g. "coverage 3.6% (14/394)").
- If data missing → say "data missing", lower confidence. Never assert readiness without data.

## Output per scope
- Verdict (healthy / at-risk / not-ready) + risk level.
- Evidence list (the metrics used).
- Top attention area.
- Missing-data warnings.
- Confidence = f(data completeness): low when links sparse (e.g. 3.6% coverage ⇒ "insufficient coverage to judge readiness").

## Model
Claude (claude-opus-4-8 or sonnet for cost) over a structured metrics payload — NOT free DB access. Deterministic inputs → explainable output. Optional snapshot storage (B7) if auditability needed.

## Anti-hallucination test
Given seeded Senaei BAU: AI must say "coverage 3.6% — far too low to assess release readiness; 3 Done stories have failing tests (BAU-6018/6075/6003)" — not invent a green status.
