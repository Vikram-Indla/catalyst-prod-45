# STATUS MAPPING

> No status meaning is assumed. Each status value → reporting meaning, user-approved.
> Until a row is CONFIRMED, reporting shows "mapping incomplete" rather than false confidence.

## Per object type — fill actual status values from DB (D3), then map with user

### Story
| Raw status | Reporting bucket (not-started/in-progress/in-QA/blocked/done/...) | State |
|------------|------------------------------------------------------------------|-------|
| _TBD from DB_ | — | ASKED |

### Test Execution result
| Raw result | Bucket (passed/failed/blocked/pending/re-test) | State |
|------------|------------------------------------------------|-------|
| _TBD from DB_ | — | ASKED |

### Defect
| Raw status | Bucket (open/in-progress/awaiting-retest/closed/...) | State |
|------------|------------------------------------------------------|-------|
| _TBD from DB_ | — | ASKED |

### Production Incident
| Raw status | Bucket | State |
|------------|--------|-------|
| _TBD from DB_ | — | ASKED |

### Release
| Raw status | Bucket (planned/in-progress/ready/released/...) | State |
|------------|-------------------------------------------------|-------|
| _TBD from DB_ | — | ASKED |

### Sprint / Iteration
| Raw status | Bucket (future/active/closed) + active-detection rule | State |
|------------|--------------------------------------------------------|-------|
| _TBD from DB_ | — | ASKED |

> Also map: Project, Epic, Feature, Sub-task, Test Case, Test Cycle, Test Step.
> Special asks (gated): what is "In QA", "Done", "Ready for release", "Production risk", "Quality risk".
