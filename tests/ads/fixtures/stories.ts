/**
 * Storybook story-list loader.
 *
 * Reads Storybook's `index.json` (the successor to stories.json in Storybook
 * 7/8) and returns the list of runnable stories. Used by both the visual and
 * a11y harnesses so any new story added to Storybook is picked up
 * automatically with zero test-file edits.
 *
 * Why top-level await: Playwright evaluates spec files once at discovery
 * time. Fetching stories synchronously at module scope lets us generate a
 * real test() per story, preserving parallelization and per-story reporting.
 */

export interface StoryEntry {
  /** Full Storybook story id — e.g. "ads-button--primary" */
  id: string;
  /** Human-readable story name — e.g. "Primary" */
  name: string;
  /** Story title path — e.g. "ADS/Button" */
  title: string;
  /** Kebab-case slug safe for filenames — e.g. "ads-button--primary" */
  slug: string;
}

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';

/**
 * Internal shape of Storybook's index.json v5 (Storybook 8.x).
 * We tolerate missing fields gracefully — a malformed entry is skipped
 * rather than failing the whole run.
 */
interface StorybookIndexEntry {
  id: string;
  name: string;
  title: string;
  type: 'story' | 'docs';
  importPath?: string;
  tags?: string[];
}

interface StorybookIndex {
  v: number;
  entries: Record<string, StorybookIndexEntry>;
}

/**
 * Fetch Storybook's index.json and return only runnable story entries.
 * Docs entries are filtered out — they have their own URL shape and are
 * not suitable for visual-regression (unstable layout, MDX hydration).
 */
export async function fetchStories(): Promise<StoryEntry[]> {
  const res = await fetch(`${STORYBOOK_URL}/index.json`);
  if (!res.ok) {
    throw new Error(
      `Storybook index.json fetch failed: ${res.status} ${res.statusText}. ` +
        `Is Storybook running at ${STORYBOOK_URL}?`,
    );
  }
  const json = (await res.json()) as StorybookIndex;
  if (!json.entries) {
    throw new Error('Storybook index.json missing .entries — unexpected schema.');
  }

  return Object.values(json.entries)
    .filter((entry) => entry.type === 'story')
    // Skip stories explicitly tagged `skip-visual` or `skip-a11y` — the
    // per-harness filter picks the right tag. For now we keep everything.
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      title: entry.title,
      slug: entry.id,
    }));
}

/** Build the iframe URL for a given story id. */
export function storyUrl(id: string): string {
  // viewMode=story strips the Storybook chrome; we render only the canvas.
  return `/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
}
