# S21 independent browser acceptance

Date: 2026-07-23  
Acceptance owner: Aiden  
Environment: live localhost staging UI backed by staging data; signed-in persona Vikram Indla.  
Claude's MCP/SQL maker-checker evidence remains developer evidence and was not replayed here.

## Independently observed

| Proof | Browser evidence | Result |
|---|---|---|
| Normal entry point | STRATA sidebar -> Command Center | PASS |
| Governed KPI rollup panel | Panel is visible on Command Center | PASS |
| Aggregation discrimination | `1 aggregating`, `1 non-aggregating` | PASS |
| KR provenance count | `1 KR` | PASS |
| Project Card provenance | `Excel Import Test Project` is named | PASS |
| Drill-through destination | `Open project cards` lands on the generic 17-card index, not the named contributing card | FAIL/PARTIAL |
| Project Objective Alignment | Excel Import Test Project -> Scope & Measures shows `Digitize the End-to-End Investor Journey`, Primary, Approved | PASS (persisted state) |
| Project observation | KA-94FD86DD25 shows 2026-06-30, value 80, Validated | PASS (persisted state) |
| Refresh | Card URL and breadcrumb persist; selected Scope & Measures tab resets to Overview | PARTIAL |
| Browser Back/Forward | Card -> Project Cards index -> same card/context URL | PASS |
| Deep link | Card URL reloads successfully with cycle/period/from context | PASS |
| Restricted persona | Only Vikram Indla session available | BLOCKED |
| Empty/error panel states | Static code/guards exist; no safe live condition/persona available to trigger them | BLOCKED (browser) |
| Loading state | Static code/guard exists; page-level loading observed, but panel-specific skeleton was not independently isolated | BLOCKED/PARTIAL |
| Two-identity actions | Persisted results visible; maker/checker actions themselves were not replayed in browser | BLOCKED |

## Acceptance ruling

S21 corrects the prior full-chain eligibility defect and its positive live data path is independently
visible. Engine 3's alignment and observation fixture is now accepted as persisted browser state.
Engine 4's live Command Center discrimination is accepted for the direct_component vs driver pair.
Engine 5 remains partial because drill-through is not provenance-specific and restricted/loading/empty/error
states lack independent browser proof.

Focused S21 guards were rerun independently: 2 files, 13 tests, PASS.

No staging mutation, production action, push, merge or PR was performed during this acceptance pass.
