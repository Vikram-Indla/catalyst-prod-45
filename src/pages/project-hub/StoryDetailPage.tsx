import { useParams, Navigate } from 'react-router-dom';

/**
 * StoryDetailPage — Redirects to Story Backlog.
 * The modal-driven experience is the canonical way to view story details.
 * Direct URLs are redirected to preserve the modal pattern.
 */
export default function StoryDetailPage() {
  const { key } = useParams<{ key: string; itemId: string }>();
  return <Navigate to={`/project-hub/${key}/story-backlog`} replace />;
}
