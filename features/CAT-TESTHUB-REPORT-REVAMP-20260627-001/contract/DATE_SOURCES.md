# DATE SOURCES

> No date is assumed. Every date used in any trend/burndown/aging/SLA/readiness/risk calc must name
> its exact source column. If source missing/ambiguous → STOP, ask, do not calculate.

| Date concept | Used by report | Source table.column | State (PROVEN/ASKED) |
|--------------|----------------|---------------------|----------------------|
| Sprint start | sprint burndown, sprint health | _TBD_ | ASKED |
| Sprint end | sprint risk (near-end pending) | _TBD_ | ASKED |
| Release start | release timeline | _TBD_ | ASKED |
| Release end / planned | release readiness | _TBD_ | ASKED |
| Release actual | post-release reporting | _TBD_ | ASKED |
| Test case created | case usage/age | _TBD_ | ASKED |
| Test case approved | coverage readiness | _TBD_ | ASKED |
| Test execution date | execution trend/history | _TBD_ | ASKED |
| Defect created | defect trend, aging | _TBD_ | ASKED |
| Defect closed | defect closure rate | _TBD_ | ASKED |
| Incident reported | incident trend | _TBD_ | ASKED |
| Incident resolved | incident MTTR | _TBD_ | ASKED |
| Story → QA date | governance mismatch | _TBD_ | ASKED |
| Story → Done date | governance mismatch | _TBD_ | ASKED |
| Retest date | verification gap | _TBD_ | ASKED |

_No trend/aging report may be built until its dates are PROVEN._
