/**
 * ADS visual-regression harness.
 *
 * Generates one Playwright test per Storybook story × theme (light/dark).
 * Each test navigates to the story's iframe, waits for the canvas to settle,
 * and pixel-diffs against the baseline PNG at 0.01 threshold (see
 * playwright.ads.config.ts).
 *
 * Baselines live next to this spec in __screenshots__/  and are platform-
 * stamped by Playwright. To refresh after an intentional design change:
 *
 *   npm run test:visual:update
 *
 * The stories list is fetched from Storybook's index.json at module load
 * (top-level await), so adding a new story in src/components/ads/*.stories.tsx
 * automatically generates a new test case with no edits here.
 */
import { test, expect } from '@playwright/test';
import { fetchStories, storyUrl } from '../fixtures/stories';

const stories = await fetchStories();

if (stories.length === 0) {
  throw new Error(
    'No Storybook stories discovered. Check that Storybook is running and ' +
      'at least one *.stories.tsx file exists under src/',
  );
}

for (const story of stories) {
  test.describe(story.title, () => {
    for (const theme of ['light', 'dark'] as const) {
      test(`${story.name} [${theme}]`, async ({ page }) => {
        // Storybook's addon-themes reads from html.class — we set it ahead
        // of navigation so the theme is correct on first paint.
        await page.addInitScript((t: string) => {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(t);
        }, theme);

        await page.goto(storyUrl(story.id));

        // Storybook signals readiness via the #storybook-root element being
        // populated. `networkidle` alone is flaky with the Vite dev server.
        const root = page.locator('#storybook-root, #root');
        await root.waitFor({ state: 'attached', timeout: 15_000 });
        await page.waitForLoadState('networkidle');

        // Give fonts + Atlaskit JS a final tick to settle. Without this
        // Sora/Inter can pixel-shift the first paint by a subpixel.
        await page.evaluate(() => document.fonts?.ready);

        await expect(page).toHaveScreenshot(`${story.slug}--${theme}.png`, {
          fullPage: false,
        });
      });
    }
  });
}
