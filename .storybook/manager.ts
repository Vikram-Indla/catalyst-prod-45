/**
 * Storybook manager — branding + sidebar layout.
 */
import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Catalyst ADS',
    brandUrl: 'https://github.com/TurnQy/catalyst-prod-44',
    brandTarget: '_blank',
  }),
  sidebar: {
    showRoots: true,
  },
});
