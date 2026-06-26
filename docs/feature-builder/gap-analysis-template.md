# Gap Analysis: <feature-slug>

> Copy to: docs/feature-builder/features/<feature-slug>/gap-analysis.md
> Populated after external-benchmark-research.md and current-state-audit.md complete.
> This is a research experiment — produces no code changes.

---

## Status Values

| Status | Meaning |
|---|---|
| `exists-verified` | Built, wired to correct DB tables, functionally tested |
| `exists-unverified` | File exists, DB wiring or functional state unknown |
| `partial` | Partially built (e.g. read works, write broken) |
| `missing` | Not built |
| `out-of-scope` | Explicitly excluded for this program run |
| `catalyst-native` | Catalyst-specific capability not in benchmark |

---

## Gap Matrix

### Category 1: <name>

| Feature | Benchmark has it | Catalyst status | Experiment |
|---|---|---|---|
| _fill_ | yes / no | _status_ | exp-xxx |

### Category 2: <name>

| Feature | Benchmark has it | Catalyst status | Experiment |
|---|---|---|---|
| _fill_ | yes / no | _status_ | exp-xxx |

### Catalyst-Native Features (not in benchmark)

| Feature | Catalyst status | Experiment |
|---|---|---|
| _fill_ | _status_ | exp-xxx |

---

## Gap Summary

```
Total features catalogued:    _fill_
Exists and verified:          0  ← start at 0; increment as experiments complete
Exists unverified:            _fill_
Partial:                      _fill_
Missing:                      _fill_
Out of scope:                 _fill_
Catalyst-native (planned):    _fill_
```

---

## Priority Order for Build Phase

_List experiments in recommended order based on dependency chain._

1. _fill_ (unblocks: _fill_)
2. _fill_
3. _fill_

---

## What "Done" Looks Like

After all non-out-of-scope features reach `exists-verified`:

_Describe the minimum viable end state here._
