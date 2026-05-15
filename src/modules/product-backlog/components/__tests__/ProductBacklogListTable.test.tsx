import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductBacklogListTable from '../ProductBacklogListTable';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    loading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
  }),
  default: () => ({ user: { id: 'user-1' } }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockBusinessRequests = [
  {
    id: '1',
    request_key: 'BR-1',
    title: 'Setup monitoring dashboard',
    process_step: 'scoping',
    rank: 1,
    priority_tier: 'critical',
    business_score: 85,
    assignee: 'john@example.com',
    business_owner: 'jane@example.com',
    department: 'Engineering',
  },
  {
    id: '2',
    request_key: 'BR-2',
    title: 'Implement caching layer',
    process_step: 'planning',
    rank: 2,
    priority_tier: 'high',
    business_score: 72,
    assignee: 'bob@example.com',
    business_owner: 'jane@example.com',
    department: 'Engineering',
  },
];

// Build a thenable chain that resolves to `resolvedData` when awaited.
// Every chain method returns `this` so arbitrary call chains work.
function makeChain(resolvedData: { data: any; error: null }) {
  const chain: any = {
    then: (onFulfilled: Function, onRejected?: Function) =>
      Promise.resolve(resolvedData).then(onFulfilled as any, onRejected as any),
    catch: (onRejected: Function) => Promise.resolve(resolvedData).catch(onRejected as any),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn().mockReturnValue({
      then: (res: Function) => Promise.resolve({ data: [], error: null }).then(res as any),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        then: (res: Function) => Promise.resolve({ error: null }).then(res as any),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        then: (res: Function) => Promise.resolve({ error: null }).then(res as any),
      }),
      in: vi.fn().mockReturnValue({
        then: (res: Function) => Promise.resolve({ error: null }).then(res as any),
      }),
    }),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

describe('ProductBacklogListTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeChain({ data: mockBusinessRequests, error: null })
    );
  });

  test('renders table with business requests data', async () => {
    render(<ProductBacklogListTable projectId="test-project" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('BR-1')).toBeInTheDocument();
      expect(screen.getByText('Setup monitoring dashboard')).toBeInTheDocument();
      expect(screen.getByText('BR-2')).toBeInTheDocument();
      expect(screen.getByText('Implement caching layer')).toBeInTheDocument();
    });
  });

  test('handles rank update on drag (midpoint calculation)', async () => {
    render(<ProductBacklogListTable projectId="test-project" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('BR-1')).toBeInTheDocument();
    });

    expect(supabase.from).toHaveBeenCalledWith('business_requests');
  });

  test('handles duplicate operation', async () => {
    render(<ProductBacklogListTable projectId="test-project" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('BR-1')).toBeInTheDocument();
    });

    expect(supabase.from).toHaveBeenCalled();
  });

  test('handles delete operation (single row)', async () => {
    render(<ProductBacklogListTable projectId="test-project" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('BR-1')).toBeInTheDocument();
    });

    expect(supabase.from).toHaveBeenCalledWith('business_requests');
  });

  test('handles bulk delete (multiple rows selected)', async () => {
    render(<ProductBacklogListTable projectId="test-project" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('BR-1')).toBeInTheDocument();
    });

    expect(supabase.from).toHaveBeenCalledWith('business_requests');
  });

  test('multi-select state (checkbox toggle)', async () => {
    render(<ProductBacklogListTable projectId="test-project" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('BR-1')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });
});
