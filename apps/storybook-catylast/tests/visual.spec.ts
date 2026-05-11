import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type StoryEntry = {
  id: string;
  title: string;
  name: string;
  type: "story" | "docs";
  importPath: string;
};

type StorybookIndex = {
  v: number;
  entries: Record<string, StoryEntry>;
};

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, "../storybook-static/index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8")) as StorybookIndex;

const stories = Object.values(index.entries).filter((e) => e.type === "story");

const themes = ["light", "dark"] as const;

for (const mode of themes) {
  test.describe(`theme: ${mode}`, () => {
    for (const story of stories) {
      test(`${story.title} — ${story.name}`, async ({ page }) => {
        const url = `/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=themeMode:${mode}`;
        await page.goto(url);

        // Storybook signals readiness via the SB_STATE_LOADED event; wait for the
        // root element and a brief settle for token CSS / web fonts.
        await page.waitForSelector("#storybook-root", { state: "attached" });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(150);

        await expect(page).toHaveScreenshot(`${story.id}-${mode}.png`, {
          fullPage: true,
        });
      });
    }
  });
}
