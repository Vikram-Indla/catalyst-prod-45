# Product lifecycle

## States

1. `exploring` — open inquiry; no implementation authority.
2. `candidate` — structured proposal awaiting approval.
3. `approved` — product decision accepted.
4. `implementation-ready` — bounded, testable, and technically grounded.
5. `in-progress` — active implementation in an isolated worktree.
6. `implemented` — code and tests produced.
7. `verified` — independently checked against acceptance criteria.
8. `released` — explicitly promoted to a target environment.

## Human approval boundaries

A model may propose a decision but may not mark it `approved`.

A model may propose a packet but may not mark it `implementation-ready` unless:
- approval metadata is present;
- repo discovery is complete;
- acceptance criteria are testable;
- regression and rollback plans exist.

A model may mark a packet `implemented`, but an independent certification pass must mark it `verified`.
