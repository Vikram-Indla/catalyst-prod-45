# UI/UX Review — per-screen verdicts + recommendations (ALL screens)

Sweep: 2026-07-06, Chrome MCP, 1600×1000, light + dark (STRATA). CRE chokepoint
gate ✓. Screenshot IDs in 06_VALIDATION_EVIDENCE.md. "Uplifted" = change shipped
this feature; "At standard" = audited equal to the Project Backlog/Board
reference the directive names as the bar.

## STRATA (all 14 + modals — the directive's main aim)
| Screen | Verdict | Recommendation shipped / next-level note |
|---|---|---|
| Command Center | UPLIFTED | breadcrumb unclipped; needs-attention lozenges short-form; typography = ADS scale. Next: none open |
| Strategy Room | UPLIFTED | breadcrumb; type chips verified token-pure. Next: none |
| Strategy Map | UPLIFTED | blank MiniMap removed; edges/legend token-pure. Next: none |
| Scorecards | UPLIFTED | breadcrumb. Next: none |
| Scorecard Detail | UPLIFTED | H2 = instance name (CRE L2 canon: trail=section, title=entity) |
| KPI Library | UPLIFTED | 9 columns fit (no h-scroll); short direction labels; ellipsis on source |
| KPI Detail | UPLIFTED | H2 = KPI name (CRE L2 canon) |
| Execution | UPLIFTED | tag tooltips (Ak Tag 180px truncation is component-owned) |
| Portfolio & VMO | UPLIFTED | register/value-profile columns fit; pending cells wrap |
| Data Pipeline | UPLIFTED | breadcrumb; stepper token-pure (no Ak progress-tracker dep — keep) |
| Reviews & Decisions | UPLIFTED | breadcrumb. Next: none |
| Administration | UPLIFTED | tab strip scrolls; breadcrumb |
| Upload Wizard | UPLIFTED | breadcrumb. Next: none |
| Evidence | UPLIFTED | breadcrumb; definition-list rows token-pure |
| New cycle / New element / Decision modals | AT STANDARD | ads Modal + Textfield + Ak datetime-picker (placeholder is component-owned) |
| Dark mode (all above) | VERIFIED | tokens flip cleanly; no bare-color slabs |

## Every other hub screen crawled
| Screen | Verdict | Recommendation |
|---|---|---|
| Home / For you | AT STANDARD | tab pills, status lozenges, ageing badge all canonical |
| Projects list | UPLIFTED | dangling "/" crumb removed |
| BAU Backlog | AT STANDARD | the reference surface; re-probed pixel-identical after icon fix |
| BAU Board (manager + kanban) | AT STANDARD | — |
| BAU Dashboard | AT STANDARD | widget chrome canonical |
| BAU Timeline | AT STANDARD | — |
| BAU Sprints | UPLIFTED | Release/Owner columns unclipped |
| Work-item detail (/browse) | UPLIFTED | dependency status column widened (was clipping longest lozenge) |
| Products list | UPLIFTED | dangling "/" removed |
| INV Product Backlog | AT STANDARD | RTL text renders correctly |
| Product Roadmap / Timeline / Milestones | AT STANDARD | milestone outline pill is Jira version-parity (keep) |
| Incident Dashboard / All / Board / Reports / Committee queue | AT STANDARD | — |
| Incident Analytics | UPLIFTED | unbuilt "[Chart]" placeholder removed (zero-assumption) |
| Release Dashboard / Changes / SOP / Sign-off / Freeze | AT STANDARD | — |
| Release Production events | UPLIFTED | hand-rolled ResultBadge → canonical Lozenge (mixed-style column fixed) |
| Test Dashboard / Repository / Plans / Cycles / Defects / Traceability / Reports | AT STANDARD | — |
| Tasks Dashboard | UPLIFTED | hub-standard inline header (was "Tasks /Dashboard") |
| Tasks Board | AT STANDARD | — |
| Ideation Backlog | UPLIFTED | duplicate IDEAS/IDEAS crumb removed; search icon fixed; ADS numerals |
| Ideation Board | AT STANDARD | — |
| Ideation Analytics | UPLIFTED | mono terminal numerals → ADS heading font |
| Programs | UPLIFTED | full page chrome + card internals → ADS tokens |
| Issue Navigator (/search) | UPLIFTED | search icon fixed (81-call-site wrapper) |
| Starred | AT STANDARD | — |
| Admin Access | UPLIFTED | status column fits "PENDING SETUP" |
| Admin (all deep links) | UPLIFTED | 404 catch-all (was silent blank) — now GLOBAL for every route |
| Global Create modal | AT STANDARD | Jira-parity form |

## Cross-cutting uplifts (apply to dozens of screens at once)
1. atlaskit-icons className/style carrier — restored 81 broken icon layouts.
2. Global 404 catch-all — no route in the app can render a silent blank again.
3. JiraTable flex-floor guidance — dense tables use fixed name columns (KPI
   Library, Sprints as templates).
4. Canonical lozenge policy — no hand-rolled pills remain on any crawled screen.
