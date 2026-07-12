/**
 * forwardTestId — tiny helper keeping Catalyst test selectors stable
 * across Atlaskit version bumps.
 *
 * Problem: some Atlaskit components rename `testId` across majors
 * (`testId` → `testid` → `data-testid`), and some apply it to a shell
 * element while Catalyst Playwright selectors need it on the inner
 * interactive node. Rather than leak that churn into product code,
 * every wrapper accepts `testId` and calls this helper to decide where
 * to forward it.
 *
 * Returns a plain `{ testId, 'data-testid' }` pair — cover both until
 * Atlaskit consolidates.
 */
export function forwardTestId(testId: string | undefined) {
  if (!testId) return {};
  return { testId, 'data-testid': testId };
}
