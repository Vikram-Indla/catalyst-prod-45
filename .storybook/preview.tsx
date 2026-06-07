import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { WorkflowProvider } from '@/lib/workflows';
import { storyQueryClient } from '@/stories/fixtures/storyQueryClient';

// Use the shared storyQueryClient so stories can pre-seed cache data
// by importing the same instance. See storyQueryClient.ts for details.
const queryClient = storyQueryClient;

const preview: Preview = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WorkflowProvider>
            <MemoryRouter>
            <Story />
            </MemoryRouter>
          </WorkflowProvider>
        </AuthProvider>
      </QueryClientProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
