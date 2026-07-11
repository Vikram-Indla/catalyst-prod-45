import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DocintelFindingsPanel } from '@/modules/docintel/components/DocintelFindingsPanel';
import { DocintelWorkItemsPanel } from '@/modules/docintel/components/DocintelWorkItemsPanel';
import type {
  DocintelFactReviewStatus,
  DocintelRequirementFact,
  DocintelTraceabilityMatrix,
} from '@/modules/docintel/types';

type FindingsState =
  | 'populated'
  | 'unreviewed'
  | 'confirmed'
  | 'rejected'
  | 'empty'
  | 'loading'
  | 'error';

const documentId = 'audio-test-revenue-target';
const projectId = 'project-1';
const factsKey = ['docintel', 'facts', documentId] as const;
const linksKey = ['docintel', 'links', documentId] as const;
const traceabilityKey = ['docintel', 'traceability', documentId, projectId] as const;

function finding(
  id: string,
  reviewStatus: DocintelFactReviewStatus,
): DocintelRequirementFact {
  return {
    id,
    document_id: documentId,
    project_id: projectId,
    kind: 'requirement',
    statement_ar: null,
    statement_en: 'The quarterly revenue target for the industrial scanning division is $4 million.',
    confidence: null,
    source_block_ids: null,
    source_page_numbers: [1],
    review_status: reviewStatus,
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-07-11T08:00:00.000Z',
  };
}

type WorkItemsState =
  | 'linked-empty'
  | 'linked-loading'
  | 'linked-error'
  | 'traceability-populated'
  | 'traceability-empty';

const traceabilityWithFinding: DocintelTraceabilityMatrix = {
  pageNumbers: [1],
  facts: [finding('traceable-finding', 'confirmed')],
  artifacts: [],
};

function createWorkItemsClient(state: WorkItemsState): QueryClient {
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

  if (state === 'linked-loading') {
    void client.prefetchQuery({
      queryKey: linksKey,
      queryFn: () => new Promise<never>(() => undefined),
    });
  } else if (state === 'linked-error') {
    const query = client.getQueryCache().build(client, {
      queryKey: linksKey,
      queryFn: async () => [],
    });
    query.setState({
      status: 'error',
      fetchStatus: 'idle',
      error: new Error('Linked work could not be loaded.'),
      errorUpdateCount: 1,
      errorUpdatedAt: Date.now(),
    });
  } else {
    client.setQueryData(linksKey, []);
  }

  client.setQueryData(
    traceabilityKey,
    state === 'traceability-populated'
      ? traceabilityWithFinding
      : { pageNumbers: [], facts: [], artifacts: [] },
  );

  return client;
}

function WorkItemsStory({ state }: { state: WorkItemsState }) {
  const [client] = useState(() => createWorkItemsClient(state));

  return (
    <QueryClientProvider client={client}>
      <DocintelWorkItemsPanel documentId={documentId} projectId={projectId} />
    </QueryClientProvider>
  );
}

const factsByState: Record<Exclude<FindingsState, 'empty' | 'loading' | 'error'>, DocintelRequirementFact[]> = {
  populated: [
    finding('finding-unreviewed', 'unreviewed'),
    finding('finding-confirmed', 'confirmed'),
    finding('finding-rejected', 'rejected'),
  ],
  unreviewed: [finding('finding-unreviewed', 'unreviewed')],
  confirmed: [finding('finding-confirmed', 'confirmed')],
  rejected: [finding('finding-rejected', 'rejected')],
};

function createStoryClient(state: FindingsState): QueryClient {
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

  if (state === 'loading') {
    void client.prefetchQuery({
      queryKey: factsKey,
      queryFn: () => new Promise<never>(() => undefined),
    });
  } else if (state === 'error') {
    const query = client.getQueryCache().build(client, {
      queryKey: factsKey,
      queryFn: async () => [],
    });
    query.setState({
      status: 'error',
      fetchStatus: 'idle',
      error: new Error('Findings could not be loaded.'),
      errorUpdateCount: 1,
      errorUpdatedAt: Date.now(),
    });
  } else {
    client.setQueryData(
      factsKey,
      state === 'empty' ? [] : factsByState[state],
    );
  }

  return client;
}

function FindingsStory({ state }: { state: FindingsState }) {
  const [client] = useState(() => createStoryClient(state));

  return (
    <QueryClientProvider client={client}>
      <DocintelFindingsPanel
        documentId={documentId}
        onOpenEvidence={fn()}
      />
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Audit Grade/24 — Doc Intel Findings',
  component: DocintelFindingsPanel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocintelFindingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  render: () => <FindingsStory state="populated" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole('table', { name: 'Document findings' })).resolves.toBeVisible();
    await expect(canvas.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Finding',
      'Kind',
      'Evidence',
      'Review state',
      'Action',
    ]);
    await expect(canvas.getAllByRole('button', { name: 'Confirm' })).toHaveLength(3);
    await expect(canvas.getAllByRole('button', { name: 'Reject' })).toHaveLength(3);
    await expect(canvas.getAllByRole('button', { name: 'Reset' })).toHaveLength(2);
    await expect(canvas.queryByRole('button', { name: /extract|re-extract/i })).not.toBeInTheDocument();
    await expect(canvas.queryByText(/ocr|embedding|provider|queue|prompt/i)).not.toBeInTheDocument();
  },
};

export const Unreviewed: Story = {
  render: () => <FindingsStory state="unreviewed" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Reject' })).toBeEnabled();
    await expect(canvas.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  },
};

export const Confirmed: Story = {
  render: () => <FindingsStory state="confirmed" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Reject' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Reset' })).toBeEnabled();
  },
};

export const Rejected: Story = {
  render: () => <FindingsStory state="rejected" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Reject' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Reset' })).toBeEnabled();
  },
};

export const Empty: Story = {
  render: () => <FindingsStory state="empty" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByText('No findings yet')).resolves.toBeVisible();
  },
};

export const Loading: Story = {
  render: () => <FindingsStory state="loading" />,
};

export const ErrorState: Story = {
  render: () => <FindingsStory state="error" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByText('Could not load findings')).resolves.toBeVisible();
  },
};

export const WorkItemsLinkedWorkEmpty: Story = {
  render: () => <WorkItemsStory state="linked-empty" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('tab', { name: 'Linked work' })).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.findByText('No linked work yet')).resolves.toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Add link' })).toBeEnabled();
    await expect(canvas.queryByText(/ocr|embedding|provider|queue|prompt|re-sync/i)).not.toBeInTheDocument();
  },
};

export const WorkItemsLinkedWorkLoading: Story = {
  render: () => <WorkItemsStory state="linked-loading" />,
};

export const WorkItemsLinkedWorkError: Story = {
  render: () => <WorkItemsStory state="linked-error" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByText('Could not load links')).resolves.toBeVisible();
  },
};

export const WorkItemsTraceability: Story = {
  render: () => <WorkItemsStory state="traceability-populated" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const traceabilityTab = canvas.getByRole('tab', { name: 'Traceability' });
    await userEvent.click(traceabilityTab);
    await expect(traceabilityTab).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.findByText('Requirement facts')).resolves.toBeVisible();
    await expect(
      canvas.getByText('The quarterly revenue target for the industrial scanning division is $4 million.'),
    ).toBeVisible();
    await expect(canvas.queryByText(/block id|confidence|embedding|provider/i)).not.toBeInTheDocument();
  },
};

export const WorkItemsTraceabilityEmpty: Story = {
  render: () => <WorkItemsStory state="traceability-empty" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: 'Traceability' }));
    await expect(canvas.findByText('Nothing to trace yet')).resolves.toBeVisible();
  },
};
