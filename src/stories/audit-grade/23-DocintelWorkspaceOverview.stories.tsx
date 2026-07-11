import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/ads';
import { DocintelWorkspaceOverview } from '@/modules/docintel/components/DocintelWorkspaceOverview';
import {
  DocintelSourceDrawer,
  type DocintelExactEvidence,
  type DocintelSourceDrawerView,
} from '@/modules/docintel/components/DocintelSourceDrawer';
import type {
  DocintelDocument,
  DocintelFormattedDocument,
} from '@/modules/docintel/types';

type ReadableSourceState = 'ready' | 'loading' | 'error' | 'empty';

const documentId = 'audio-test-revenue-target';

const sourceDocument: DocintelDocument = {
  id: documentId,
  project_id: 'project-1',
  slug: 'audio-test-revenue-target',
  title: 'Audio Test — Revenue Target',
  original_file_name: 'audio-test-revenue-target.pdf',
  mime_type: 'application/pdf',
  storage_path: 'project-1/audio-test-revenue-target.pdf',
  file_size: null,
  page_count: 1,
  source_language: 'en',
  status: 'ready',
  status_detail: null,
  latency_ms: null,
  content_hash: null,
  error_message: null,
  created_by: null,
  created_at: '2026-07-11T08:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z',
};

const formattedDocument: DocintelFormattedDocument = {
  document: sourceDocument,
  elements: [
    {
      id: 'heading-1',
      page: 1,
      kind: 'heading',
      rawKind: 'heading',
      text_en: 'Audio Test — Revenue Target',
      text_ar: null,
      isChrome: false,
    },
    {
      id: 'paragraph-1',
      page: 1,
      kind: 'paragraph',
      rawKind: 'paragraph',
      text_en: 'The quarterly revenue target for the industrial scanning division is $4 million.',
      text_ar: null,
      isChrome: false,
    },
  ],
};

const exactEvidence: DocintelExactEvidence = {
  claimText: 'The quarterly revenue target for the industrial scanning division is $4 million.',
  quotedText: 'The quarterly revenue target for the industrial scanning division is $4 million.',
  pageNumber: 1,
  sourceTitle: sourceDocument.title,
  sourceType: 'Document',
  versionLabel: 'v1',
};

function createDrawerClient(state: ReadableSourceState): QueryClient {
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
  const queryKey = ['docintel', 'formatted', documentId] as const;

  if (state === 'loading') {
    void client.prefetchQuery({
      queryKey,
      queryFn: () => new Promise<never>(() => undefined),
    });
  } else if (state === 'error') {
    const query = client.getQueryCache().build(client, {
      queryKey,
      queryFn: async () => formattedDocument,
    });
    query.setState({
      status: 'error',
      fetchStatus: 'idle',
      error: new Error('Readable source could not be loaded.'),
      errorUpdateCount: 1,
      errorUpdatedAt: Date.now(),
    });
  } else {
    client.setQueryData(
      queryKey,
      state === 'empty' ? { document: sourceDocument, elements: [] } : formattedDocument,
    );
  }

  return client;
}

function DrawerTriggerState() {
  const [isOpen, setIsOpen] = useState(false);
  const client = createDrawerClient('ready');

  return (
    <QueryClientProvider client={client}>
      <Button onClick={() => setIsOpen(true)}>View source</Button>
      <DocintelSourceDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        documentId={documentId}
      />
    </QueryClientProvider>
  );
}

function DrawerState({
  state = 'ready',
  initialView = 'source',
  evidence = null,
  onClose = fn(),
}: {
  state?: ReadableSourceState;
  initialView?: DocintelSourceDrawerView;
  evidence?: DocintelExactEvidence | null;
  onClose?: () => void;
}) {
  const client = createDrawerClient(state);
  return (
    <QueryClientProvider client={client}>
      <DocintelSourceDrawer
        isOpen
        onClose={onClose}
        documentId={documentId}
        exactEvidence={evidence}
        initialView={initialView}
      />
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Audit Grade/23 — Doc Intel Workspace Overview',
  component: DocintelWorkspaceOverview,
  parameters: { layout: 'padded' },
  args: {
    onAsk: fn(),
    onReviewFindings: fn(),
    onCreateDeliverable: fn(),
  },
} satisfies Meta<typeof DocintelWorkspaceOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  args: {
    findingCounts: {
      total: 5,
      unreviewed: 2,
      confirmed: 2,
      rejected: 1,
    },
    deliverableCounts: {
      total: 3,
      approved: 1,
    },
  },
};

export const ZeroCounts: Story = {
  args: {
    findingCounts: {
      total: 0,
      unreviewed: 0,
      confirmed: 0,
      rejected: 0,
    },
    deliverableCounts: {
      total: 0,
      approved: 0,
    },
  },
};

export const CountsUnavailable: Story = {
  args: {},
};

export const DisabledWhileSourceIsUnavailable: Story = {
  args: {
    isDisabled: true,
  },
};

export const DrawerClosedTrigger: Story = {
  render: () => <DrawerTriggerState />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'View source' });
    await expect(within(globalThis.document.body).queryByText('Readable source')).not.toBeInTheDocument();
    await userEvent.click(trigger);
    await expect(within(globalThis.document.body).findByText('Readable source')).resolves.toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const ReadableSourceOpen: Story = {
  render: () => <DrawerState />,
};

export const ReadableSourceLoading: Story = {
  render: () => <DrawerState state="loading" />,
};

export const ReadableSourceError: Story = {
  render: () => <DrawerState state="error" />,
};

export const ReadableSourceNotReady: Story = {
  render: () => <DrawerState state="empty" />,
};

const closeExactEvidence = fn();

export const ExactEvidenceOpen: Story = {
  render: () => (
    <DrawerState
      initialView="evidence"
      evidence={exactEvidence}
      onClose={closeExactEvidence}
    />
  ),
  play: async () => {
    closeExactEvidence.mockClear();
    const body = within(globalThis.document.body);
    await expect(body.findByText('Quoted from source')).resolves.toBeVisible();
    await expect(body.queryByText(/block|confidence|embedding|provider/i)).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(closeExactEvidence).toHaveBeenCalledTimes(1));
  },
};

export const ExactEvidenceQuotationUnavailable: Story = {
  render: () => (
    <DrawerState
      initialView="evidence"
      evidence={{
        claimText: exactEvidence.claimText,
        quotedText: null,
        sourceTitle: sourceDocument.title,
      }}
    />
  ),
};

export const ExactEvidenceMissingOptionalFields: Story = {
  render: () => (
    <DrawerState
      initialView="evidence"
      evidence={{ quotedText: exactEvidence.quotedText }}
    />
  ),
};

export const ExactEvidenceUnavailable: Story = {
  render: () => <DrawerState initialView="evidence" />,
};
