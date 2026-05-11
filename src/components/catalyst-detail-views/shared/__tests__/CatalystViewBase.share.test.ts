/**
 * CatalystViewBase — Share / copy-link URL contract
 *
 * Vikram defect (2026-05-10): "When I click Share, it shows the hub URL
 * but not the ticket URL."
 *
 * Root cause: handleShare gates the ticket-URL branch on `fullPageMode`.
 * In modal mode the fallback copies `window.location.href` — which is
 * the hub page (e.g. /project-hub/BAU/allwork or /for-you), NOT the
 * ticket URL.
 *
 * Fix: whenever `itemKey` + `projectKey` are available, ALWAYS construct
 * the canonical ticket URL `${origin}/project-hub/${projectKey}/issue/${itemKey}`.
 * The mode (modal vs full-page) is irrelevant — Share should always copy
 * a permalink to the ticket itself.
 *
 * Static-source test — same pattern as other canonical parity tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../CatalystViewBase.tsx'),
  'utf-8',
);

describe('CatalystViewBase — Share URL canonical parity', () => {
  it('handleShare does NOT gate the ticket-URL branch on fullPageMode alone', () => {
    // The wrong pattern: `if (fullPageMode && itemKey && projectKey)`
    // gates the ticket URL on mode, so modal mode falls through to
    // window.location.href (the hub URL).
    expect(
      src.includes('if (fullPageMode && itemKey && projectKey)'),
      'CatalystViewBase.handleShare must NOT gate the ticket-URL branch ' +
      'on fullPageMode. Modal mode also needs the ticket URL — gate only ' +
      'on (itemKey && projectKey), or drop the gate and always construct ' +
      'the canonical /project-hub/{projectKey}/issue/{itemKey} URL.',
    ).toBe(false);
  });

  it('handleShare does NOT fall back to window.location.href when ticket key is known', () => {
    // window.location.href in modal mode returns the hub URL. Sharing the
    // hub URL when the user clicked Share on a specific ticket is wrong.
    // The fallback is only acceptable when itemKey is genuinely unavailable.
    expect(
      src.match(/navigator\.clipboard\.writeText\(window\.location\.href\)/g)?.length ?? 0,
      'CatalystViewBase.handleShare must not copy window.location.href as ' +
      'the primary path. When itemKey + projectKey are known, always copy ' +
      'the ticket URL.',
    ).toBeLessThanOrEqual(0);
  });
});
