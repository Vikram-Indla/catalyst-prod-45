/**
 * Hub tone registry — single source of truth for the colour each hub
 * carries throughout Catalyst.
 *
 * Consumers:
 *   - HubSwitcher tile background + glyph color (Step 7.2)
 *   - Sidebar active row left-accent bar (Step 7.6 — turns the colourful
 *     popover into a system that echoes across surfaces)
 *   - Future: breadcrumb dot, issue-row hub badge, detail-panel border
 *
 * Adding a new hub means:
 *   1. add its `/path-prefix` here and pick an ADS accent suffix
 *   2. add it to HUBS[] in components/layout/HubSwitcher.tsx (with the
 *      same tone) and the matching key in HubIcon.tsx
 *
 * Tone names map 1:1 to Atlaskit accent tokens
 * (`var(--ds-background-accent-{tone}-subtler)` and
 * `var(--ds-text-accent-{tone})`).
 */
export type HubTone =
  | 'blue'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'green'
  | 'magenta'
  | 'lime'
  | 'red'
  | 'yellow'
  | 'gray';

const PATH_TO_TONE: Array<{ prefix: string; tone: HubTone }> = [
  { prefix: '/for-you',                tone: 'blue'    },
  { prefix: '/strata',                 tone: 'purple'  },
  { prefix: '/ideation',               tone: 'orange'  },
  { prefix: '/product-hub',            tone: 'teal'    },
  { prefix: '/project-hub',            tone: 'green'   },
  { prefix: '/release-hub',            tone: 'magenta' },
  { prefix: '/testhub',                tone: 'lime'    },
  { prefix: '/incident-hub',           tone: 'red'     },
  { prefix: '/tasks',                tone: 'yellow'  },
  { prefix: '/docex',                  tone: 'gray'    },
];

/**
 * Returns the hub tone for a given URL path, or null if the path does
 * not belong to any registered hub.
 *
 * Matches by prefix so sub-paths like `/product-hub/roadmap/123` resolve
 * to the same tone as `/product-hub` itself.
 */
export function pathToHubTone(path: string): HubTone | null {
  for (const { prefix, tone } of PATH_TO_TONE) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      return tone;
    }
  }
  return null;
}

/**
 * Returns the ADS text-accent token (CSS variable expression) for a
 * given URL path. Falls back to `--cp-blue` for unmapped paths so the
 * sidebar accent bar always renders something legible.
 */
export function hubAccentToken(path: string): string {
  const tone = pathToHubTone(path);
  return tone ? `var(--ds-text-accent-${tone})` : 'var(--cp-blue)';
}
