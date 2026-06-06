/**
 * Pages/For You/AI Theme — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import AiThemePanel from '@/components/for-you/atlaskit/AiThemePanel';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></MemoryRouter></div>);
}

export default { title: 'Pages/For You/AI Theme' };

export const AiThemePanelDefault: StoryObj = {
  name: 'AiThemePanel / Default',
  render: () => <Wrap><AiThemePanel allUserProjects=[] /></Wrap>,
}
