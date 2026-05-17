/**
 * For You Page Header — Jira parity (2026-05-17 jira-compare).
 *
 * Jira's /jira/for-you page heading is `24px / 600 / 28px`, sentence-case
 * ("For you", not "For You"), no subtitle.
 *
 * @atlaskit/heading `size="large"` resolves to `--ds-font-heading-large`,
 * which in this theme renders at 24/500 — half a weight step too light.
 * Probe 2026-05-17 confirmed 500, not 600. We render an inline <h1> with
 * explicit weight 600 so the heading reads at Jira's actual on-screen weight.
 */

import { token } from '@atlaskit/tokens';

export function ForYouHeader() {
  return (
    <header className="fy-header" style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 16,
    }}>
      <h1 style={{
        margin: 0,
        font: '600 24px/28px var(--ds-font-family-body, "Inter", system-ui, sans-serif)',
        letterSpacing: 'normal',
        color: token('color.text', '#172B4D'),
      }}>
        For you
      </h1>
    </header>
  );
}
