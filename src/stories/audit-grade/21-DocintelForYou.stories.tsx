import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { DocintelRecentWork } from '@/modules/docintel/components/DocintelRecentWork';
import type {
  DocintelArtifact,
  DocintelDocument,
} from '@/modules/docintel/types';

const source: DocintelDocument = {
  id: 'source-1',
  project_id: 'project-1',
  slug: 'industrial-scanning-brd',
  title: 'Industrial Scanning BRD',
  original_file_name: 'industrial-scanning-brd.pdf',
  mime_type: 'application/pdf',
  storage_path: 'project-1/industrial-scanning-brd.pdf',
  file_size: 428_000,
  page_count: 24,
  source_language: 'en',
  status: 'ready',
  status_detail: null,
  latency_ms: null,
  content_hash: 'example-source-hash',
  error_message: null,
  created_by: 'user-1',
  created_at: '2026-07-10T08:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z',
};

const deliverable: DocintelArtifact = {
  id: 'deliverable-1',
  project_id: 'project-1',
  document_ids: ['source-1'],
  artifact_type: 'brd',
  title: 'Industrial Scanning — reviewed BRD',
  content: null,
  content_md: null,
  grounding_score: 0.94,
  status: 'approved',
  promoted_work_item_id: null,
  rejection_reason: null,
  created_at: '2026-07-11T09:30:00.000Z',
};

const meta = {
  title: 'Audit Grade/21 — Doc Intel For You',
  component: DocintelRecentWork,
  parameters: { layout: 'padded' },
  args: {
    onOpenSource: fn(),
    onOpenDeliverable: fn(),
  },
} satisfies Meta<typeof DocintelRecentWork>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  args: {
    sources: [
      source,
      {
        ...source,
        id: 'source-2',
        slug: 'implementation-plan',
        title: 'Implementation plan',
        status: 'needs_review',
        updated_at: '2026-07-11T08:00:00.000Z',
      },
    ],
    deliverables: [
      deliverable,
      {
        ...deliverable,
        id: 'deliverable-2',
        artifact_type: 'gap_analysis',
        title: 'BRD gap analysis',
        status: 'draft',
        created_at: '2026-07-11T07:30:00.000Z',
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    sources: [],
    deliverables: [],
  },
};

export const Loading: Story = {
  args: {
    sources: [],
    deliverables: [],
    isLoading: true,
  },
};

export const ErrorState: Story = {
  args: {
    sources: [],
    deliverables: [],
    error: new Error('Recent sources and deliverables could not be loaded.'),
  },
};
