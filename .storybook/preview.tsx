/**
 * Storybook preview — global decorators + parameters.
 *
 * Every story in the ADS surface:
 *   1. Renders inside <AdsThemeProvider> so Atlaskit tokens are live.
 *   2. Honours the theme toolbar toggle — switching to 'dark' flips the
 *      html.dark class AND tells Atlaskit to use its dark-mode tokens.
 *   3. Runs axe-core on the rendered DOM (addon-a11y). WCAG 2.1 AA ruleset.
 *
 * The theme decorator is intentionally simple — it flips the DOM class
 * directly rather than touching Catalyst's Supabase-backed ThemeProvider,
 * because stories should be hermetic. AdsThemeProvider itself subscribes
 * to the html.dark class via its own Catalyst hook chain, so Atlaskit
 * tokens re-resolve on every toggle.
 */
import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import React, { useEffect, type ReactNode } from 'react';
import { setGlobalTheme } from '@atlaskit/tokens';
import { atlaskitCustomColors } from '../src/theme/ads/tokens';

// Inject the app's global CSS so --cp-* variables are defined in stories.
import '../src/index.css';

/**
 * StoryThemeBridge — tiny decorator component that mirrors AdsThemeProvider
 * without pulling in Catalyst's Supabase hooks (which aren't available in
 * Storybook). Reads the classList set by addon-themes and drives Atlaskit.
 */
function StoryThemeBridge({ children }: { children: ReactNode }) {
  useEffect(() => {
    const apply = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const mode: 'light' | 'dark' = isDark ? 'dark' : 'light';
      void setGlobalTheme({
        colorMode: mode,
        customColors: atlaskitCustomColors(mode) as unknown as Record<string, string>,
      } as Parameters<typeof setGlobalTheme>[0]);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  return <>{children}</>;
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      // Use CSS vars so the background follows light/dark automatically.
      default: 'catalyst',
      values: [
        { name: 'catalyst', value: 'var(--cp-bg-page, #FFFFFF)' },
        { name: 'surface', value: 'var(--cp-bg-surface, #FFFFFF)' },
        { name: 'inset', value: 'var(--cp-bg-inset, #F1F5F9)' },
      ],
    },
    a11y: {
      // addon-a11y runs axe-core in-browser; the Playwright a11y project
      // re-runs the same rules headless in CI. WCAG 2.1 AA ruleset.
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'button-name', enabled: true },
          { id: 'aria-required-attr', enabled: true },
          { id: 'aria-valid-attr', enabled: true },
          { id: 'aria-valid-attr-value', enabled: true },
          { id: 'landmark-unique', enabled: true },
          { id: 'label', enabled: true },
        ],
      },
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      },
    },
    layout: 'padded',
  },
  decorators: [
    // Global theme class decorator — light or dark on html root.
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story) => (
      <StoryThemeBridge>
        <Story />
      </StoryThemeBridge>
    ),
  ],
};

export default preview;
