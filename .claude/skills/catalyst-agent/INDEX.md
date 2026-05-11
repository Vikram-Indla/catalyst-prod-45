# /catalyst-agent — Agent Index

All 184 agents installed at `~/.claude/agents/` from
[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents),
grouped by category with Catalyst relevance flags.

- **🟢 high** — actively used by the ROUTER.md matrix
- **🟡 medium** — situationally useful, may be picked for niche tasks
- **🔴 low** — out of scope for Catalyst (game dev, marketing personas, etc.)
  but kept in library so the orchestrator can still reach them when explicitly
  requested via `--agents`.

Total: 184 agents across 50 prefix categories.

---

## Engineering — 29 agents (🟢 HIGH overall)

The core of Catalyst routing. Most matrix rows pick from here.

| Agent | Relevance | Used for |
|---|---|---|
| `engineering-frontend-developer` | 🟢 | Primary UI implementer. JiraTable, CatalystView*, BacklogPage, panels, modals. |
| `engineering-backend-architect` | 🟢 | Edge functions, RPC design, Supabase data flow. |
| `engineering-database-optimizer` | 🟢 | RLS, migrations, `ph_*` schema, indexes. |
| `engineering-security-engineer` | 🟢 | RLS policy audits, AdminGuard coverage, secret handling. |
| `engineering-code-reviewer` | 🟢 | Always-on gate for any code change. |
| `engineering-codebase-onboarding-engineer` | 🟢 | Phase 0 trace; read-only file/anchor enumeration. |
| `engineering-minimal-change-engineer` | 🟢 | Phase 3 plan paring; "smallest correct change" enforcement. |
| `engineering-senior-developer` | 🟢 | Fallback primary for cross-cutting or ambiguous tasks. |
| `engineering-software-architect` | 🟢 | New page / new module design; component boundary decisions. |
| `engineering-git-workflow-master` | 🟢 | Branch hygiene, commit shaping, PR creation. |
| `engineering-technical-writer` | 🟢 | CLAUDE.md lesson drafting, Obsidian handover docs. |
| `engineering-devops-automator` | 🟢 | CI workflow edits, GitHub Actions, deploy scripts. |
| `engineering-sre` | 🟡 | Incident-style debugging; rarely needed but useful for performance fires. |
| `engineering-incident-response-commander` | 🟡 | Production incident playbook. |
| `engineering-data-engineer` | 🟡 | When data pipelines or analytical queries are involved. |
| `engineering-rapid-prototyper` | 🟡 | Throwaway experiments / spike work. |
| `engineering-ai-engineer` | 🟡 | When LLM features (improve-issue, summarisation) are touched. |
| `engineering-ai-data-remediation-engineer` | 🟡 | Data cleanup involving AI outputs. |
| `engineering-autonomous-optimization-architect` | 🟡 | Larger perf/refactor architectures. |
| `engineering-cms-developer` | 🟡 | If Catalyst grows a content surface. |
| `engineering-mobile-app-builder` | 🔴 | Catalyst is web-only. |
| `engineering-embedded-firmware-engineer` | 🔴 | Not applicable. |
| `engineering-solidity-smart-contract-engineer` | 🔴 | Not applicable. |
| `engineering-voice-ai-integration-engineer` | 🔴 | Not applicable. |
| `engineering-feishu-integration-developer` | 🔴 | Feishu (Chinese Slack) — not in scope. |
| `engineering-wechat-mini-program-developer` | 🔴 | Out of scope. |
| `engineering-email-intelligence-engineer` | 🔴 | Out of scope. |
| `engineering-filament-optimization-specialist` | 🔴 | 3D printing — out of scope. |
| `engineering-threat-detection-engineer` | 🟡 | Security audits; rare. |

---

## Design — 8 agents (🟢 HIGH overall)

Pairs with the 7 Foundation Council masters in design-intelligence /
design-critique. Operational counterparts.

| Agent | Relevance | Used for |
|---|---|---|
| `design-ui-designer` | 🟢 | Visual hierarchy, ADS token alignment, lozenge/typography fixes. |
| `design-ux-architect` | 🟢 | Information architecture, flow design, ADS pattern selection. |
| `design-ux-researcher` | 🟢 | Recognition-vs-recall, real-world matching for heuristics. |
| `design-brand-guardian` | 🟢 | Consistency & ADS conformance enforcement. |
| `design-visual-storyteller` | 🟢 | Phase 5 visual evidence narration. |
| `design-inclusive-visuals-specialist` | 🟢 | Inclusion overlay on accessibility audits. |
| `design-whimsy-injector` | 🟡 | Empty-state delight, microinteraction polish — sparingly. |
| `design-image-prompt-engineer` | 🟡 | For generated imagery in onboarding/empty states. |

---

## Testing — 8 agents (🟢 HIGH overall)

Always-on verifiers come from here.

| Agent | Relevance | Used for |
|---|---|---|
| `testing-reality-checker` | 🟢 | Always-on for layer-ambiguous bugs (CLAUDE.md 2026-05-11). |
| `testing-evidence-collector` | 🟢 | Always-on for any UI surface (SVG arrows, before/after). |
| `testing-accessibility-auditor` | 🟢 | WCAG 2.1 AA gate on a11y-touching surfaces. |
| `testing-test-results-analyzer` | 🟢 | Vitest/Playwright triage between TDD cycles. |
| `testing-api-tester` | 🟢 | CRUD gate verification in jira-compare. |
| `testing-performance-benchmarker` | 🟢 | Bundle size, TTI, performance probes. |
| `testing-tool-evaluator` | 🟡 | When adding test infra. |
| `testing-workflow-optimizer` | 🟡 | CI/CD workflow improvements. |

---

## Project Management — 6 agents (🟢 most)

Includes the Jira workflow steward — key for parity work.

| Agent | Relevance | Used for |
|---|---|---|
| `project-management-jira-workflow-steward` | 🟢 | Phase 0.5 28-pattern scan; Jira screen scheme reads (anti-pattern #18). |
| `project-management-experiment-tracker` | 🟡 | If A/B experiments enter scope. |
| `project-management-project-shepherd` | 🟡 | Multi-PR coordination. |
| `project-management-studio-operations` | 🔴 | Generic ops, less applicable. |
| `project-management-studio-producer` | 🔴 | Generic, less applicable. |
| `project-manager-senior` | 🟡 | High-stake plan oversight. |

---

## Product — 5 agents (🟡 mixed)

| Agent | Relevance | Used for |
|---|---|---|
| `product-feedback-synthesizer` | 🟡 | Phase 6 lesson distillation companion. |
| `product-trend-researcher` | 🟡 | Market intelligence inputs (rare). |
| `product-manager` | 🟡 | Scope decisions on new features. |
| `product-sprint-prioritizer` | 🟡 | Multi-task ordering. |
| `product-behavioral-nudge-engine` | 🔴 | Out of scope for Catalyst engineering. |

---

## Specialized — 11 agents (🟡 mixed; a few 🟢)

| Agent | Relevance | Used for |
|---|---|---|
| `agents-orchestrator` | 🟢 | Fallback primary when no matrix row matches. |
| `specialized-mcp-builder` | 🟢 | MCP server creation (Atlassian MCP, custom tooling). |
| `specialized-developer-advocate` | 🟡 | API docs, onboarding flows. |
| `specialized-chief-of-staff` | 🟡 | High-stake plan oversight. |
| `specialized-workflow-architect` | 🟡 | Cross-skill orchestration design. |
| `specialized-document-generator` | 🟡 | Templated doc emission. |
| `specialized-salesforce-architect` | 🔴 | Not applicable. |
| `specialized-civil-engineer` | 🔴 | Not applicable. |
| `specialized-cultural-intelligence-strategist` | 🔴 | Not applicable. |
| `specialized-french-consulting-market` | 🔴 | Not applicable. |
| `specialized-korean-business-navigator` | 🔴 | Not applicable. |
| `specialized-model-qa` | 🟡 | When evaluating LLM outputs. |

---

## Other categories — 🔴 LOW relevance for Catalyst engineering

These categories exist in the library but the router will rarely if ever
pick from them. They remain reachable via `--agents <name>` if the user
explicitly requests one.

| Category | Count | Note |
|---|---|---|
| marketing | 30 | Reddit, content, SEO, growth — out of Catalyst dev scope. |
| sales | 10 | Outreach, intake — out of scope. |
| paid-media | 7 | Ads, optimization — out of scope. |
| support | 6 | Customer service — out of scope. |
| finance | 5 | Bookkeeping, taxes — out of scope. |
| academic | 5 | Research workflows — out of scope. |
| unreal / unity / godot / blender / xr / roblox / visionos | 16 | Game / 3D — out of scope. |
| legal | 3 | Compliance, intake, billing — out of scope. |
| healthcare | 2 | Out of scope. |
| game-development | 2 | Out of scope. |
| `zk-steward`, `visionos`, `terminal`, `narrative`, `macos`, `lsp-index-engineer`, `loan-officer-assistant`, `level`, `language-translator`, `identity-graph-operator`, `hr-onboarding`, `hospitality-guest-services`, `government-digital-presales-consultant`, `data-consolidation-agent`, `customer-service`, `corporate-training-designer`, `compliance-auditor`, `blockchain-security-auditor`, `automation-governance-architect`, `agentic-identity-trust`, `accounts-payable-agent`, `study-abroad-advisor`, `supply-chain-strategist`, `report-distribution-agent`, `retail-customer-returns`, `recruitment-specialist`, `real-estate-buyer-seller`, `sales-data-extraction-agent`, `sales-outreach`, `technical-writer` (specialized variant), `healthcare-marketing-compliance`, `healthcare-customer-service`, `legal-billing-time-tracking`, `legal-client-intake`, `legal-document-review` | various | Singleton agents in niche domains; reachable but not auto-routed. |

---

## Top 10 for Catalyst (sorted by routing frequency)

These appear in 3+ rows of the decision matrix:

1. `engineering-frontend-developer`
2. `engineering-code-reviewer`
3. `testing-reality-checker`
4. `testing-evidence-collector`
5. `project-management-jira-workflow-steward`
6. `engineering-database-optimizer`
7. `engineering-security-engineer`
8. `testing-accessibility-auditor`
9. `engineering-codebase-onboarding-engineer`
10. `design-ui-designer`

---

## Top 5 never-auto-routed (use only with `--agents`)

These are reachable but never picked by the matrix. They exist because
the underlying library shipped them. Don't activate without intent.

1. `marketing-reddit-ninja` — Reddit community work
2. `sales-outreach` — cold outreach
3. `finance-accountant` — bookkeeping
4. `legal-document-review` — contract markup
5. `game-development-*` — game design

---

## How to use this index

- **Reading order:** SKILL.md → ROUTER.md → INDEX.md. SKILL.md tells you the
  pipeline, ROUTER.md the picks, INDEX.md what's available.
- **Extending:** when a new task type emerges, check if an existing 🟡 agent
  can be promoted to 🟢 by adding a matrix row. Adding a new agent is
  out-of-scope here — that's a `~/.claude/agents/` install.
- **Removing low-relevance:** don't. Keeping them in the library means
  `--agents <name>` always works for one-off needs. Storage is free.

---

## Source

`msitarzewski/agency-agents` installed via:
`./scripts/install.sh --tool claude-code --no-interactive`

Reinstall to refresh:
```bash
git clone --depth 1 https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents
bash /tmp/agency-agents/scripts/install.sh --tool claude-code --no-interactive
```
