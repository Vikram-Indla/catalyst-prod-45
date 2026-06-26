# Hypothesis: sample-feature / exp-000

**Title:** Generic capability dry run
**Date:** 2026-06-26
**Type:** research

> Research experiment — NO code changes allowed. Documentation only.

---

## Hypothesis

_What we expect to find or prove. Fill before starting work._

---

## Allowed Edit Surface

```
Allowed:   <fill before coding>
Forbidden: everything else
           Always forbidden: supabase/, package.json, CLAUDE.md
```

---

## Acceptance Criteria

Declare ALL criteria before writing any code or documentation.

- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] ADS audit: 0 new violations in touched files (build experiments only)
- [ ] TypeScript: 0 new errors (build experiments only)

---

## Pre-Work Reuse Check (build experiments only)

```bash
# Search before building
grep -r "<concept>" src/components src/lib src/hooks --include="*.tsx" --include="*.ts" -l
```

**Found:** _fill_
**Decision:** mount existing | extend | build new (needs human approval if new)
