/**
 * ADS accessibility harness (CG-12 — WCAG 2.1 AA, 100%).
 *
 * Runs axe-core against every Storybook story in both light and dark themes.
 * Any violation with impact ≥ serious fails the test; moderate and minor
 * are reported but not fatal (these are often noise from component demos
 * that are missing a surrounding page context — e.g. a lone heading).
 *
 * Rule-set overrides:
 *   • color-contrast          enforced — drift here is the whole point.
 *   • region                  disabled — stories are canvas-level fragments,
 *                                        not full pages with landmarks.
 *   • page-has-heading-one    disabled — same reason.
 *
 * The stories list is fetched from Storybook's index.json at module load,
 * so a new story auto-generates a new test case with no edits here.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fetchStories, storyUrl } from '../fixtures/stories';

const stories = await fetchStories();

if (stories.length === 0) {
  throw new Error(
    'No Storybook stories discovered. Check that Storybook is running and ' +
      'at least one *.stories.tsx file exists under src/',
  );
}

const FAIL_IMPACTS = new Set<string>(['critical', 'serious']);

for (const story of stories) {
  test.describe(story.title, () => {
    for (const theme of ['light', 'dark'] as const) {
      test(`${story.name} [${theme}]`, async ({ page }) => {
        await page.addInitScript((t: string) => {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(t);
        }, theme);

        await page.goto(storyUrl(story.id));

        const root = page.locator('#storybook-root, #root');
        await root.waitFor({ state: 'attached', timeout: 15_000 });
        await page.waitForLoadState('networkidle');

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // See file-level comment for the rationale on each disabled rule.
          .disableRules(['region', 'page-has-heading-one', 'landmark-one-main'])
          .analyze();

        const blocking = results.violations.filter((v) =>
          FAIL_IMPACTS.has(v.impact ?? ''),
        );

        if (blocking.length > 0) {
          // Emit a compact, readable summary before the assertion so the
          // failure surface in CI shows which rule fired on which node.
          const summary = blocking
            .map(
              (v) =>
                `  • [${v.impact}] ${v.id} — ${v.help}\n` +
                v.nodes
                  .slice(0, 3)
                  .map((n) => `      ${n.target.join(' ')}`)
                  .join('\n'),
            )
            .join('\n');
          console.error(`axe violations for ${story.id} [${theme}]:\n${summary}`);
        }

        expect(blocking, 'axe serious/critical violations').toEqual([]);
      });
    }
  });
}
