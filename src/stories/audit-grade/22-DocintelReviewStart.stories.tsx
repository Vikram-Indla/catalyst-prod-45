import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextType } from '@/lib/auth';
import DocintelReviewStartPage from '@/modules/docintel/pages/DocintelReviewStartPage';
import type {
  DocintelDocument,
  DocintelDocumentVersion,
} from '@/modules/docintel/types';

type StoryState = 'ready' | 'no-project' | 'no-sources' | 'loading' | 'error';

const userId = 'story-user';
const project = { id: 'project-1', key: 'BAU', name: 'BAU transformation' };
const projectsKey = ['docintel', 'projects', userId] as const;
const documentsKey = ['docintel', 'list', project.id] as const;

const source: DocintelDocument = {
  id: 'document-1',
  project_id: project.id,
  slug: 'payments-brd',
  title: 'Payments BRD',
  original_file_name: 'payments.docx',
  mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  storage_path: `${project.id}/payments.docx`,
  file_size: 512_000,
  page_count: 12,
  source_language: 'en',
  status: 'ready',
  status_detail: null,
  latency_ms: null,
  content_hash: 'example-payments-brd-hash',
  error_message: null,
  created_by: userId,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-10T00:00:00.000Z',
};

const version: DocintelDocumentVersion = {
  id: 'version-3',
  document_id: source.id,
  version_no: 3,
  storage_path: null,
  content_hash: null,
  created_by: userId,
  created_at: '2026-07-10T00:00:00.000Z',
};

const authValue: AuthContextType = {
  user: { id: userId } as User,
  session: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => undefined,
  sendOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  loading: false,
  isAuthenticated: true,
};

function createStoryClient(state: StoryState): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
    },
  });

  if (state === 'loading') {
    void client.prefetchQuery({
      queryKey: projectsKey,
      queryFn: () => new Promise<never>(() => undefined),
    });
    return client;
  }

  if (state === 'error') {
    const query = client.getQueryCache().build(client, {
      queryKey: projectsKey,
      queryFn: async () => [],
    });
    query.setState({
      status: 'error',
      fetchStatus: 'idle',
      error: new Error('Projects could not be loaded.'),
      errorUpdateCount: 1,
      errorUpdatedAt: Date.now(),
    });
    return client;
  }

  client.setQueryData(projectsKey, state === 'no-project' ? [] : [project]);
  if (state !== 'no-project') {
    client.setQueryData(documentsKey, state === 'no-sources' ? [] : [source]);
  }
  if (state === 'ready') {
    client.setQueryData(['docintel', 'versions', source.id], [version]);
  }

  return client;
}

function SeedReviewLocation({ sourceSlug }: { sourceSlug?: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      pathname: '/doc-intelligence/actions/review',
      search: sourceSlug ? `source=${sourceSlug}` : '',
    }, { replace: true });
  }, [navigate, sourceSlug]);

  return null;
}

function ReviewStartStory({ state }: { state: StoryState }) {
  const [client] = useState(() => createStoryClient(state));

  return (
    <AuthContext.Provider value={authValue}>
      <QueryClientProvider client={client}>
        <SeedReviewLocation sourceSlug={state === 'ready' ? source.slug ?? undefined : undefined} />
        <DocintelReviewStartPage />
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

const meta = {
  title: 'Audit Grade/22 — Doc Intel Review Start',
  component: DocintelReviewStartPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DocintelReviewStartPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  render: () => <ReviewStartStory state="ready" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Latest available version: v3')).resolves.toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Start review' })).toBeEnabled();
    await expect(canvas.queryByText(/compare versions/i)).not.toBeInTheDocument();
  },
};

export const NoProject: Story = {
  render: () => <ReviewStartStory state="no-project" />,
};

export const NoSources: Story = {
  render: () => <ReviewStartStory state="no-sources" />,
};

export const Loading: Story = {
  render: () => <ReviewStartStory state="loading" />,
};

export const ErrorState: Story = {
  render: () => <ReviewStartStory state="error" />,
};
