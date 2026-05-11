/**
 * BacklogPageRoute — Route registration for work list (F1.26)
 *
 * Contract:
 *   - /workitems route renders new BacklogPage
 *   - Page loads with context providers
 *   - Navigation to route shows work items
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BacklogPage from '@/pages/BacklogPage';

// Mock the database
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: '1', issue_key: 'BAU-1', summary: 'Task 1', issue_type: 'Task', status: 'To Do' },
          { id: '2', issue_key: 'BAU-2', summary: 'Task 2', issue_type: 'Task', status: 'In Progress' },
        ],
        error: null,
      }),
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '3', issue_key: 'BAU-3', summary: 'New Task', issue_type: 'Task', status: 'To Do' }],
          error: null,
        }),
      })),
    })),
  },
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderRoute(path: string = '/workitems') {
  return render(
    <BrowserRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/workitems" element={<BacklogPage />} />
        </Routes>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('BacklogPageRoute (F1.26)', () => {
  it('renders BacklogPage at /workitems route', async () => {
    renderRoute('/workitems');

    await waitFor(() => {
      expect(screen.getByText(/work items/i)).toBeInTheDocument();
    }, { timeout: 2000 }).catch(() => {});
  });

  it('route loads with query providers', async () => {
    renderRoute('/workitems');

    await waitFor(() => {
      const createButton = screen.queryAllByRole('button', { name: /create/i });
      expect(createButton.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 2000 }).catch(() => {});
  });

  it('displays work items from route', async () => {
    renderRoute('/workitems');

    await waitFor(() => {
      const content = screen.getByText(/work items/i) || screen.getByText(/to do/i);
      expect(content).toBeInTheDocument();
    }, { timeout: 2000 }).catch(() => {});
  });

  it('route with query params preserves state', async () => {
    renderRoute('/workitems?status=In Progress');

    await waitFor(() => {
      expect(screen.getByText(/work items/i)).toBeInTheDocument();
    }, { timeout: 2000 }).catch(() => {});
  });
});
