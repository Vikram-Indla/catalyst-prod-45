import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Routes } from '@/lib/routes';
import { DocintelIntentComposer } from '../DocintelIntentComposer';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../AskPanel', () => ({
  AskPanel: ({ mode, projectId, documentId, themeId }: {
    mode: string;
    projectId: string;
    documentId?: string;
    themeId?: string;
  }) => (
    <div data-testid="ask-panel-contract">
      {mode}:{projectId}:{documentId ?? 'project'}:{themeId ?? 'all-themes'}
    </div>
  ),
}));

const project = { id: 'project-1', key: 'BAU', name: 'BAU transformation' };
const source = { id: 'document-1', slug: 'payments-brd', title: 'Payments BRD' };
const theme = { id: 'theme-1', name: 'Payments' };

function renderComposer(
  props: Partial<React.ComponentProps<typeof DocintelIntentComposer>> = {},
) {
  return render(
    <MemoryRouter>
      <DocintelIntentComposer
        project={project}
        sourcesAvailable
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('DocintelIntentComposer', () => {
  beforeEach(() => navigateMock.mockReset());

  it('shows the exact Ask scope before using the proven AskPanel contract', () => {
    renderComposer({ source, theme });

    expect(screen.getByText('Current scope')).toBeInTheDocument();
    expect(screen.getByText('BAU transformation · Payments BRD · Theme: Payments')).toBeInTheDocument();
    expect(screen.getByTestId('ask-panel-contract')).toHaveTextContent(
      'hero:project-1:document-1:theme-1',
    );
  });

  it('renders an honest no-project state without mounting Ask', () => {
    renderComposer({ project: null, sourcesAvailable: false });

    expect(screen.getByText('Choose a project to continue')).toBeInTheDocument();
    expect(screen.queryByTestId('ask-panel-contract')).not.toBeInTheDocument();
    expect(screen.queryByText('Current scope')).not.toBeInTheDocument();
  });

  it('renders an actionable no-source state without claiming analysis exists', () => {
    renderComposer({ sourcesAvailable: false });

    expect(screen.getByText('Add a source to continue')).toBeInTheDocument();
    expect(screen.getByText('BAU transformation · No sources available')).toBeInTheDocument();
    expect(screen.queryByTestId('ask-panel-contract')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upload source' }));
    expect(navigateMock).toHaveBeenCalledWith({
      pathname: Routes.docintel.upload(),
      search: 'project=BAU',
    });
  });

  it('routes Review through the review start route with explicit project and source scope', () => {
    renderComposer({ source });

    fireEvent.click(screen.getByRole('tab', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));

    expect(navigateMock).toHaveBeenCalledWith({
      pathname: Routes.docintel.review(),
      search: 'project=BAU&source=payments-brd',
    });
  });

  it('routes Create to the selected source workspace where generation already exists', () => {
    renderComposer({ source });

    fireEvent.click(screen.getByRole('tab', { name: 'Create' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open source workspace' }));

    expect(navigateMock).toHaveBeenCalledWith({
      pathname: Routes.docintel.workspace('payments-brd'),
      search: 'project=BAU',
    });
  });

  it('requires a selected source before Review or Create can continue', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('tab', { name: 'Review' }));
    expect(screen.getByText('Choose a source to review')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Create' }));
    expect(screen.getByText('Choose a source to create')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
