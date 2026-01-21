// ════════════════════════════════════════════════════════════════════════════
// SPACE VIEW PAGE - Container for space views
// ════════════════════════════════════════════════════════════════════════════

import { Outlet, useParams } from 'react-router-dom';
import { SpacesSidebar, AddMemberModal, CreateWorkItemModal } from '@/components/spaces';
import { useSpace } from '@/hooks/spaces';

export default function SpaceViewPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: space, isLoading, isError } = useSpace(spaceId);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-60 bg-background border-r border-border animate-pulse" />
        <div className="flex-1 p-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !space) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Space not found</h2>
          <p className="text-muted-foreground">The space you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SpacesSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <AddMemberModal />
      <CreateWorkItemModal />
    </div>
  );
}
