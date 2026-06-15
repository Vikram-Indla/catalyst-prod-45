import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { WorkflowProvider } from '@/lib/workflows';
import { storyQueryClient } from '@/stories/fixtures/storyQueryClient';

// App CSS — required for Tailwind utilities (.flex, .grid, etc.) used by
// real components like PragmaticBoard. Without these, components render
// without their Tailwind-driven layout (columns stack vertically, gaps
// disappear, etc.).
import '@/index.css';
import '@/styles/catalyst-typography.css';
import '@/styles/catalyst-theme.css';
import '@/tokens/jira-parity-overrides.css';

const queryClient = storyQueryClient;

class StoryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[Storybook story crashed]', error); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 16, margin: 16, border: '1px solid var(--ds-border-danger, #CA3521)',
          borderRadius: 4, background: 'var(--ds-background-danger, #FFEBE6)',
          fontFamily: 'var(--ds-font-family-body, ui-sans-serif)', color: 'var(--ds-text, #172B4D)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Story render failed</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--ds-font-family-code, ui-monospace)' }}>
            {this.state.error.message}
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--ds-text-subtle, #505258)' }}>
            Story is using placeholder props ({'{{} as any}'}). Pass real mock data via render().
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const preview: Preview = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WorkflowProvider>
            <MemoryRouter>
              <StoryErrorBoundary>
                <Story />
              </StoryErrorBoundary>
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
