# Headless testing policy

Use the repository's existing test framework when present.

For web E2E coverage, prefer Playwright when compatible with the existing stack.

Minimum evidence for a changed UI journey:

- headless Chromium pass;
- screenshot on failure;
- trace retained on first retry;
- browser-console error capture;
- failed network request capture;
- accessibility scan;
- deterministic test data;
- no production credentials;
- HTML report stored outside source control unless intentionally archived.

Do not add Playwright until repository discovery confirms it is absent or insufficient.
