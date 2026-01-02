# Test Management Module - Automated Tests

This directory contains automated tests to prevent UI regression in the Test Management module.

## Test Files

### `smoke.spec.ts`
Smoke tests that validate:
- All tabs navigate correctly (Overview, Cases, Sets, Cycles, Reports)
- Primary CTAs are functional (Create Case, Create Cycle, Create Set, Generate Report)
- No dead CTAs exist on any page (buttons without handlers)

### `golden-path.spec.ts`
End-to-end test covering the complete workflow:
1. Create Test Case
2. Create Test Cycle
3. Open Cycle Execution
4. Set Step Status
5. Create Defect
6. Generate User Activity Report

## Running Tests

### Run All Test Management Tests
```bash
npx playwright test --project=test-management-smoke --project=test-management-golden-path
```

### Run Only Smoke Tests
```bash
npx playwright test --project=test-management-smoke
```

### Run Only Golden Path Test
```bash
npx playwright test --project=test-management-golden-path
```

### Run with UI (Debug Mode)
```bash
npx playwright test --project=test-management-smoke --ui
```

### Run in CI
```bash
CI=true npx playwright test --project=test-management-smoke --project=test-management-golden-path
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYWRIGHT_TEST_BASE_URL` | Base URL for tests | `http://localhost:5173` |
| `TEST_USER_EMAIL` | Test user email for login | `test@example.com` |
| `TEST_USER_PASSWORD` | Test user password | `testpassword123` |

## CTA Validation

The tests include a "No Dead CTA" assertion that scans for elements with `data-cta` attributes and validates they have:
- An `onClick` handler, OR
- A valid `href` attribute, OR
- Are form submit buttons

Disabled buttons must have a reason (via `data-disabled-reason`, `title`, or `aria-label`).

## Adding `data-cta` Attributes

To enable CTA validation on your buttons, add the `data-cta` attribute:

```tsx
<Button data-cta="create-case" onClick={handleCreate}>
  Create Case
</Button>

<Button data-cta="submit-form" type="submit">
  Submit
</Button>

<Button data-cta="disabled-action" disabled data-disabled-reason="No items selected">
  Delete
</Button>
```

## CI Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run Test Management Tests
  run: |
    npm ci
    npx playwright install --with-deps
    npm run dev &
    npx playwright test --project=test-management-smoke --project=test-management-golden-path
```

## Troubleshooting

### Tests fail with login issues
Ensure `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set correctly in your environment.

### Tests timeout
Increase the timeout in the test file or run with `--timeout=60000`.

### Elements not found
Run with `--ui` to debug and inspect the page state.
