import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocintelDocument, DocintelDocumentVersion } from '../../types';
import DocintelReviewStartPage from '../DocintelReviewStartPage';

const navigateMock = vi.fn();
let activeProject: { id: string; key: string; name: string } | null;
let documents: DocintelDocument[];
let versions: DocintelDocumentVersion[];

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../hooks/useActiveDocintelProject', () => ({
  useActiveDocintelProject: () => ({ activeProject, setActiveProjectKey: vi.fn() }),
}));

vi.mock('../../hooks/useDocintel', () => ({
  useDocintelProjects: () => ({
    data: activeProject ? [activeProject] : [],
    isLoading: false,
    isError: false,
  }),
  useDocintelDocuments: () => ({ data: documents, isLoading: false, isError: false }),
  useDocumentVersions: (documentId?: string) => ({
    data: documentId ? versions : [],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../../components/DocintelSourcePicker', () => ({
  DocintelSourcePicker: ({
    documents: sourceDocuments,
    selectedDocumentId,
    onChange,
    label,
  }: {
    documents: DocintelDocument[];
    selectedDocumentId: string | null;
    onChange: (id: string | null) => void;
    label: string;
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={selectedDocumentId ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Select a source</option>
        {sourceDocuments.map((document) => (
          <option key={document.id} value={document.id}>{document.title}</option>
        ))}
      </select>
    </label>
  ),
}));

const source: DocintelDocument = {
  id: 'document-1',
  project_id: 'project-1',
  slug: 'payments-brd',
  title: 'Payments BRD',
  original_file_name: 'payments.docx',
  mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  storage_path: 'project-1/payments.docx',
  file_size: null,
  page_count: 12,
  source_language: 'en',
  status: 'ready',
  status_detail: null,
  latency_ms: null,
  content_hash: null,
  error_message: null,
  created_by: 'user-1',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-10T00:00:00Z',
};

const version = (number: number): DocintelDocumentVersion => ({
  id: `version-${number}`,
  document_id: source.id,
  version_no: number,
  storage_path: null,
  content_hash: null,
  created_by: 'user-1',
  created_at: `2026-07-0${number}T00:00:00Z`,
});

function renderPage(initialEntry = '/doc-intelligence/actions/review') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DocintelReviewStartPage />
    </MemoryRouter>,
  );
}

describe('DocintelReviewStartPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    activeProject = { id: 'project-1', key: 'BAU', name: 'BAU transformation' };
    documents = [source];
    versions = [version(3), version(2)];
  });

  it('presents exactly three decisions and makes the non-persisted launch explicit', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '1. Review job' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Source and version' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3. Expected outcome' })).toBeInTheDocument();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: 'Source' })).toBeInTheDocument();
    expect(screen.getByText(/does not create or claim a persisted review record/i)).toBeInTheDocument();
  });

  it('shows only the latest available version because findings are document-current', () => {
    renderPage('/doc-intelligence/actions/review?source=payments-brd');

    expect(screen.getByText('Latest available version: v3')).toBeInTheDocument();
    expect(screen.queryByText(/v2/)).not.toBeInTheDocument();
    expect(screen.queryByText(/compare versions/i)).not.toBeInTheDocument();
  });

  it('keeps Start disabled until a ready source is selected', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Start review' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Source' }), {
      target: { value: source.id },
    });
    expect(screen.getByRole('button', { name: 'Start review' })).toBeEnabled();
  });

  it('opens the selected source current Findings view without a version claim', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: 'Source' }), {
      target: { value: source.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));

    expect(navigateMock).toHaveBeenCalledWith({
      pathname: '/doc-intelligence/source/payments-brd',
      search: 'project=BAU&view=findings',
    });
  });

  it('renders an honest no-project state', () => {
    activeProject = null;
    documents = [];
    renderPage();

    expect(screen.getByText('No project available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument();
  });

  it('offers Upload when the active project has no sources', () => {
    documents = [];
    renderPage();

    expect(screen.getByText('No sources available')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload source' }));
    expect(navigateMock).toHaveBeenCalledWith({
      pathname: '/doc-intelligence/upload',
      search: 'project=BAU',
    });
  });
});
