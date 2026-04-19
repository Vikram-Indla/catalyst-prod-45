/**
 * Storybook main config — Catalyst ADS layer.
 *
 * What Storybook is for in this codebase
 * ──────────────────────────────────────
 * 1. Stable visual fixture for every ADS wrapper — one story per variant /
 *    interaction state. Playwright visual-regression snapshots these.
 * 2. axe-core accessibility surface — the `addon-a11y` addon runs axe on
 *    every story in the browser; CI runs the same axe rules headless via
 *    Playwright.
 * 3. Developer surface — swap the theme toolbar toggle to flip light/dark
 *    and verify NOCTURNE parity at a glance.
 *
 * What Storybook is NOT for
 * ─────────────────────────
 * - It is NOT a product playground. Stories exercise the wrapper layer,
 *   not product flows. Product flows live in Playwright tests against the
 *   running app. Keeping this distinction sharp protects story churn when
 *   product changes.
 * - It is NOT deployed to production. Its build is deployed to Vercel
 *   preview for design review only.
 */
import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: [
    '../src/components/ads/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',        // axe-core in the Storybook UI + CI hook
    '@storybook/addon-themes',      // light/dark toolbar toggle → AdsThemeProvider
    '@storybook/addon-interactions', // play() functions for interaction tests
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    // react-docgen-typescript is slow on large Atlaskit trees. Leave
    // autodocs off by default; stories carry JSDoc where needed.
    reactDocgen: false,
  },
  docs: {
    autodocs: false,
  },
  // Mirror vite.config's @ alias so stories import from @/components/ads.
  async viteFinal(base) {
    return mergeConfig(base, {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
        },
      },
      // Pre-bundle Atlaskit deps so first story mount is warm, mirroring
      // the app's vite.config optimizeDeps (see CLAUDE.md §1 adoption
      // protocol).
      optimizeDeps: {
        include: [
          '@atlaskit/avatar',
          '@atlaskit/avatar-group',
          '@atlaskit/breadcrumbs',
          '@atlaskit/button',
          '@atlaskit/checkbox',
          '@atlaskit/dropdown-menu',
          '@atlaskit/dynamic-table',
          '@atlaskit/empty-state',
          '@atlaskit/flag',
          '@atlaskit/heading',
          '@atlaskit/inline-edit',
          '@atlaskit/lozenge',
          '@atlaskit/modal-dialog',
          '@atlaskit/popup',
          '@atlaskit/primitives',
          '@atlaskit/progress-bar',
          '@atlaskit/section-message',
          '@atlaskit/select',
          '@atlaskit/spinner',
          '@atlaskit/textfield',
          '@atlaskit/tokens',
          '@atlaskit/tooltip',
        ],
      },
      // Atlaskit reads process.env.NODE_ENV at module load — shim it so
      // stories don't throw during boot.
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
        'process.env': '{}',
        'process.platform': '"browser"',
        'process.version': '""',
      },
    });
  },
};

export default config;
