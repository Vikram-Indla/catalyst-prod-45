---
name: certify-feature
description: Independently verify a completed feature packet.
---

Use a fresh agent/thread that did not implement the change.

1. Read packet and evidence.
2. Inspect diff and runtime.
3. Re-run tests.
4. Validate every acceptance criterion.
5. Verify screenshots and browser traces.
6. Check context contamination and out-of-scope changes.
7. Mark `verified` only when evidence is complete.
8. Otherwise return a precise rejection list.
