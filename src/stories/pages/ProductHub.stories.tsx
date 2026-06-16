import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ViewToggle, type ViewMode } from '@/components/business-requests/ViewToggle';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ─── ViewToggle ────────────────────────────────────────────────────────────

const viewToggleMeta: Meta<typeof ViewToggle> = {
  title: 'Pages/Product Hub/ViewToggle',
  component: ViewToggle,
  args: {
    currentView: 'list',
    onViewChange: fn(),
  },
};

export default viewToggleMeta;

type VTStory = StoryObj<typeof ViewToggle>;

export const ListView: VTStory = {
  args: { currentView: 'list' },
};

export const KanbanView: VTStory = {
  args: { currentView: 'kanban' },
};

export const TableView: VTStory = {
  args: { currentView: 'table', showTable: true },
};

export const Interactive: VTStory = {
  render: () => {
    const [view, setView] = useState<ViewMode>('list');
    return (
      <div style={{ padding: 24 }}>
        <ViewToggle currentView={view} onViewChange={setView} showTable />
        <p style={{ marginTop: 16, color: 'var(--ds-text-subtle, #42526E)' }}>
          Current view: <strong>{view}</strong>
        </p>
      </div>
    );
  },
};

// ─── CreateProductModal ────────────────────────────────────────────────────

export const CreateProductModalOpen: StoryObj = {
  name: 'CreateProductModal / Open',
  render: () => {
    const CreateProductModal = React.lazy(
      () => import('@/components/product-hub/CreateProductModal')
    );
    return (
      <Providers>
        <React.Suspense fallback={<div>Loading...</div>}>
          <CreateProductModal open={true} onClose={fn()} />
        </React.Suspense>
      </Providers>
    );
  },
};

// ─── CreateBusinessRequestModal ────────────────────────────────────────────

export const CreateBRModalOpen: StoryObj = {
  name: 'CreateBusinessRequestModal / Open',
  render: () => {
    const CreateBusinessRequestModal = React.lazy(
      () => import('@/components/business-requests/CreateBusinessRequestModal')
    );
    return (
      <Providers>
        <React.Suspense fallback={<div>Loading...</div>}>
          <CreateBusinessRequestModal isOpen={true} onClose={fn()} />
        </React.Suspense>
      </Providers>
    );
  },
};
