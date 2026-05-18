/**
 * MockAppProvider — lightweight context sandbox for /admin/components previews.
 *
 * Wraps fixtures that need app-level providers (QueryClient, Router) so that
 * organisms and molecules that call hooks can render without the full Catalyst
 * app shell or Supabase connection. Queries that hit the network will silently
 * return undefined / empty — the component shows its loading or empty state,
 * which is the correct preview behaviour for the admin inventory.
 *
 * Usage in fixtures:
 *   'my-component': () => (
 *     <MockAppProvider>
 *       <MyComponent issueKey="PREVIEW-1" />
 *     </MockAppProvider>
 *   ),
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/** Fresh isolated QueryClient for each preview render. */
function makeMockClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface MockAppProviderProps {
  children: React.ReactNode;
}

export function MockAppProvider({ children }: MockAppProviderProps) {
  // New client per mount — keeps previews isolated from each other and from
  // the real app QueryCache.
  const qc = makeMockClient();

  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}
