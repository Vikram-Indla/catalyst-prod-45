# Human Approval Gates

**Who approves:** Vikram (JK) required. Aiden required for DB schema changes, new edge functions, AI features.

---

## Gate 1 — Capability Approval (one-time)

**When:** Before the generic Catalyst Feature Builder capability is used for any real feature.
**What to approve:** The generic scripts, templates, and invocation guide.
**Gate output:** Confirmation that `init-feature.sh <real-feature> "<objective>"` can run.

- [ ] Vikram approved generic capability
- [ ] Aiden reviewed scripts
- **Approved:** _date_

---

## Gate 2 — Feature Start Approval

**When:** Before running `init-feature.sh` for any new feature.
**What to approve:** Feature slug + objective.
**Gate output:** `init-feature.sh` can run.

No approval needed if Vikram initiated the request verbally or in writing.

---

## Gate 3 — Phase 0 → Phase 1 Gate (per feature)

**When:** After all research experiments (exp-001 through exp-005 typically) complete.
**What to approve:** Target Catalyst design + experiment roadmap for build phase.
**Gate output:** Build phase experiments can start.

- Must show: completed gap analysis
- Must show: approved target design
- Must show: approved experiment roadmap
- **Vikram approved:** _date_

---

## Gate 4 — DB Schema Change (per change)

**When:** Any experiment proposes a new table, column, or migration.
**What to approve:** The specific SQL migration.
**Gate output:** `apply_migration` MCP can run on staging.

Requirements:
- Written migration reviewed by Vikram + Aiden
- Staging tested first (NEVER production directly)
- RLS policies included in same migration

- **Vikram approved:** _date_
- **Aiden approved:** _date_

---

## Gate 5 — New Edge Function (per function)

**When:** Any experiment proposes a new Supabase edge function.
**What to approve:** Function name, purpose, input/output schema.
**Gate output:** `deploy_edge_function` MCP can run on staging.

- **Vikram approved:** _date_
- **Aiden approved:** _date_

---

## Gate 6 — New Route (per route)

**When:** Any experiment adds a new route to FullAppRoutes.tsx.
**What to approve:** Route path + component.
**Gate output:** Route can be added and committed.

No Aiden approval needed. Vikram verbal or written confirmation sufficient.

- **Vikram approved:** _date_

---

## Gate 7 — AI Feature (per feature)

**When:** Any experiment implements an AI call (Gemini, Anthropic, etc.).
**What to approve:** Edge function spec, token budget, user interaction model, opt-out mechanism.
**Gate output:** AI experiment can start.

Requirements:
- Must use existing GEMINI_API_KEY or ANTHROPIC_API_KEY (no new providers without approval)
- Must follow AIIntelligenceButton pattern (static rainbow, no animation)
- Must log to `tm_ai_usage_log` or equivalent
- Must never auto-create — suggest only

- **Vikram approved:** _date_
- **Aiden approved:** _date_

---

## Gate 8 — Cross-Hub Integration (per integration)

**When:** Any experiment reads or writes to another hub's tables (ph_issues from testhub, business_requests from admin, etc.).
**What to approve:** Which tables, read or write, query pattern.

- **Vikram approved:** _date_

---

## Gate 9 — Phase Completion + Ship (per phase)

**When:** After all experiments in a phase complete with `keep` decisions.
**What to approve:** Phase output review + merge to main.
**Gate output:** PR can be created and merged.

- **Vikram reviewed output:** _date_
- **Vikram approved merge:** _date_

---

## Non-Negotiable Rules

These gates cannot be bypassed regardless of urgency:

1. **No DB schema change without Gate 4** — even a column rename
2. **No edge function without Gate 5** — even a minor modification
3. **No AI feature without Gate 7** — no matter how small the AI call
4. **No merge to main without Gate 9** — even for obvious fixes
5. **Staging first always** — production is promotion-only (CLAUDE.md P0)
