/**
 * StoryDetailView — TOMBSTONE (2026-04-19).
 *
 * This file previously held a 498-line hand-rolled Jira-parity clone of the
 * Story detail screen (inline Key Details, inline parent picker, inline
 * priority dropdown, its own linked-items list, its own delete dialog, and
 * a StoryDetailSidebar stub that returned null).
 *
 * That hand-roll diverged from the canonical tree used everywhere else in
 * the app — CatalystDetailRouter → CatalystViewStory → StoryDetailModal V15
 * — which is how Kanban, Backlog, IssueDetailPage, ListView, ForYouPage,
 * WorkTree, ExecutionWorkbench, AllWork, and IncidentAnalytics all render
 * work items. It was also orphaned: no router reference; the
 * /project-hub/:key/story/:itemId route bounced to /story-backlog.
 *
 * Story View unification (2026-04-19) replaces this hand-roll with a thin
 * shim that forwards to the canonical CatalystDetailRouter in fullPageMode,
 * so any lingering import keeps working and drift cannot return.
 *
 * See the route owner: src/pages/project-hub/StoryDetailPage.tsx
 */
import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

interface StoryDetailViewProps {
  projectId: string;
  projectKey: string;
  itemId: string;
}

export default function StoryDetailView({ projectId, projectKey, itemId }: StoryDetailViewProps) {
  const navigate = useNavigate();

  const handleClose = () => {
    if (projectKey) {
      navigate(`/project-hub/${projectKey}/story-backlog`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={true}
          onClose={handleClose}
          itemId={itemId}
          projectId={projectId}
          projectKey={projectKey}
          fullPageMode={true}
        />
      </Suspense>
    </div>
  );
}
