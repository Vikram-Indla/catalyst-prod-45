import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextType } from '@/lib/auth';
import { GenerationPanel } from '@/modules/docintel/components/GenerationPanel';
import {
  ARTIFACT_TYPES,
  type DocintelGeneratedArtifactType,
} from '@/modules/docintel/components/artifactTypes';
import { docintelApi } from '@/modules/docintel/domain';
import type { DocintelProjectArtifact } from '@/modules/docintel/domain';
import DocintelDeliverablesPage from '@/modules/docintel/pages/DocintelDeliverablesPage';
import type {
  DocintelArtifact,
  DocintelArtifactWithCitations,
} from '@/modules/docintel/types';

type DeliverablesState = 'empty' | 'history' | 'generating' | 'generation-error';

const projectId = 'project-1';
const documentId = 'audio-test-revenue-target';
const artifactId = 'document-summary';
const artifactsKey = ['docintel', 'artifacts', projectId, documentId] as const;
const artifactKey = ['docintel', 'artifact', artifactId] as const;
const projectArtifactsKey = ['docintel', 'artifacts', 'project', projectId] as const;
const userId = 'story-user';
const projectsKey = ['docintel', 'projects', userId] as const;

const exactArtifactValues: DocintelGeneratedArtifactType[] = [
  'summary_en',
  'summary_ar',
  'gap_analysis',
  'open_questions',
  'brd',
  'epic',
  'story',
  'business_process',
  'acceptance_criteria',
  'test_cases',
  'traceability',
  'release_notes',
];

const summaryArtifact: DocintelArtifact = {
  id: artifactId,
  project_id: projectId,
  document_ids: [documentId],
  artifact_type: 'summary_en',
  title: 'Document Summary',
  content: null,
  content_md: 'The quarterly revenue target for the industrial scanning division is $4 million. [E1]',
  grounding_score: null,
  status: 'draft',
  promoted_work_item_id: null,
  rejection_reason: null,
  created_at: '2026-07-09T00:00:00.000Z',
};

const summaryWithCitation: DocintelArtifactWithCitations = {
  artifact: summaryArtifact,
  citations: [
    {
      id: 'summary-citation-1',
      artifact_id: artifactId,
      claim_text: 'The quarterly revenue target for the industrial scanning division is $4 million.',
      document_id: documentId,
      page_number: 1,
      block_id: null,
      quoted_text: 'The quarterly revenue target for the industrial scanning division is $4 million.',
      confidence: null,
    },
  ],
};

const projectArtifact: DocintelProjectArtifact = {
  ...summaryArtifact,
  updated_at: null,
  source_documents: [
    {
      id: documentId,
      title: 'Audio Test — Revenue Target',
      slug: 'audio-test-revenue-target',
    },
  ],
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

function createStoryClient(state: DeliverablesState): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
      mutations: { retry: false },
    },
  });

  client.setQueryData(
    artifactsKey,
    state === 'history' ? [summaryArtifact] : [],
  );
  client.setQueryData(artifactKey, summaryWithCitation);
  return client;
}

function DeliverablesStory({ state }: { state: DeliverablesState }) {
  const [client] = useState(() => createStoryClient(state));

  useEffect(() => {
    const originalGenerate = docintelApi.generateArtifact;
    if (state === 'generating') {
      docintelApi.generateArtifact = () => new Promise<never>(() => undefined);
    } else if (state === 'generation-error') {
      docintelApi.generateArtifact = async () => {
        throw new Error('The deliverable could not be generated.');
      };
    }

    return () => {
      docintelApi.generateArtifact = originalGenerate;
    };
  }, [state]);

  return (
    <QueryClientProvider client={client}>
      <GenerationPanel projectId={projectId} documentId={documentId} />
    </QueryClientProvider>
  );
}

type ProjectHubState = 'populated' | 'empty' | 'loading' | 'error';

function createProjectHubClient(state: ProjectHubState): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
      mutations: { retry: false },
    },
  });

  client.setQueryData(projectsKey, [
    { id: projectId, key: 'BAU', name: 'BAU transformation' },
  ]);
  client.setQueryData(artifactKey, summaryWithCitation);

  if (state === 'loading') {
    void client.prefetchQuery({
      queryKey: projectArtifactsKey,
      queryFn: () => new Promise<never>(() => undefined),
    });
  } else if (state === 'error') {
    const query = client.getQueryCache().build(client, {
      queryKey: projectArtifactsKey,
      queryFn: async () => [],
    });
    query.setState({
      status: 'error',
      fetchStatus: 'idle',
      error: new Error('Project deliverables could not be loaded.'),
      errorUpdateCount: 1,
      errorUpdatedAt: Date.now(),
    });
  } else {
    client.setQueryData(
      projectArtifactsKey,
      state === 'populated' ? [projectArtifact] : [],
    );
  }

  return client;
}

function ProjectHubStory({ state }: { state: ProjectHubState }) {
  const [client] = useState(() => createProjectHubClient(state));

  return (
    <AuthContext.Provider value={authValue}>
      <QueryClientProvider client={client}>
        <DocintelDeliverablesPage />
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

const meta = {
  title: 'Audit Grade/25 — Doc Intel Deliverables',
  component: GenerationPanel,
  parameters: { layout: 'padded' },
  args: {
    projectId,
    documentId,
  },
} satisfies Meta<typeof GenerationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => <DeliverablesStory state="empty" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('No artifacts yet')).resolves.toBeVisible();
    await expect(ARTIFACT_TYPES.map((type) => type.value)).toEqual(exactArtifactValues);
    await expect(ARTIFACT_TYPES).toHaveLength(12);
    for (const type of ARTIFACT_TYPES) {
      await expect(
        canvas.getByRole('button', { name: `${type.label}: ${type.description}` }),
      ).toBeVisible();
    }
    await expect(canvas.getByText('Understand')).toBeVisible();
    await expect(canvas.getByText('Plan delivery')).toBeVisible();
    await expect(canvas.getByText('Validate and ship')).toBeVisible();
  },
};

export const Generating: Story = {
  render: () => <DeliverablesStory state="generating" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Generate Executive Summary' }));
    await expect(canvas.findByText(/Generating… \d+s/)).resolves.toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Generate Executive Summary' })).toBeDisabled();
  },
};

export const GenerationError: Story = {
  render: () => <DeliverablesStory state="generation-error" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Generate Executive Summary' }));
    await expect(canvas.findByText('Generation failed')).resolves.toBeVisible();
    await expect(canvas.getByText('The deliverable could not be generated.')).toBeVisible();
  },
};

export const History: Story = {
  render: () => <DeliverablesStory state="history" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole('table', { name: 'Generated deliverables' })).resolves.toBeVisible();
    await expect(canvas.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Title',
      'Type',
      'Grounding',
      'Review state',
      'Created',
    ]);
    await expect(canvas.getByText('Document Summary')).toBeVisible();
    await expect(canvas.getByText('draft')).toBeVisible();
  },
};

export const OpenedArtifactCanReopen: Story = {
  render: () => <DeliverablesStory state="history" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const history = await canvas.findByRole('table', { name: 'Generated deliverables' });
    await userEvent.click(within(history).getByText('Document Summary'));
    await expect(canvas.findByRole('button', { name: 'Close' })).resolves.toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Approve' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Reject' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'View source p.1' })).toBeEnabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(canvas.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    await userEvent.click(within(history).getByText('Document Summary'));
    await expect(canvas.findByRole('button', { name: 'Close' })).resolves.toBeVisible();
  },
};

export const ProjectHubPopulated: Story = {
  render: () => <ProjectHubStory state="populated" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole('table', { name: 'Project deliverables' })).resolves.toBeVisible();
    await expect(canvas.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Source',
      'Title',
      'Type',
      'Review',
      'Grounding',
      'Updated',
    ]);
    await expect(canvas.getByText('Audio Test — Revenue Target')).toBeVisible();
    await expect(canvas.getByText('Document Summary')).toBeVisible();
    await expect(canvas.getByText('Executive Summary')).toBeVisible();
    await expect(canvas.getByText('draft')).toBeVisible();
    await expect(canvas.getAllByText('—')).toHaveLength(2);
    await expect(canvas.queryByRole('button', { name: /edit|save/i })).not.toBeInTheDocument();
    await expect(canvasElement.querySelector(`a[href*="${artifactId}"]`)).toBeNull();
  },
};

export const ProjectHubEmpty: Story = {
  render: () => <ProjectHubStory state="empty" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('No deliverables yet')).resolves.toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Browse sources' })).toBeEnabled();
  },
};

export const ProjectHubLoading: Story = {
  render: () => <ProjectHubStory state="loading" />,
};

export const ProjectHubError: Story = {
  render: () => <ProjectHubStory state="error" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByText('Could not load deliverables')).resolves.toBeVisible();
  },
};

export const ProjectHubDrawerDetails: Story = {
  render: () => <ProjectHubStory state="populated" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = await canvas.findByRole('table', { name: 'Project deliverables' });
    await userEvent.click(within(table).getByText('Document Summary'));

    const body = within(globalThis.document.body);
    await expect(body.findByText('1 claim cited')).resolves.toBeVisible();
    await expect(body.getByRole('button', { name: 'View source p.1' })).toBeEnabled();
    await expect(globalThis.document.querySelector(`a[href*="${artifactId}"]`)).toBeNull();
    await expect(body.queryByRole('button', { name: /edit|save/i })).not.toBeInTheDocument();
  },
};
