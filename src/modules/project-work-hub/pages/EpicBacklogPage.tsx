import React from 'react';
import { useParams } from 'react-router-dom';

export default function EpicBacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <p>Epic Backlog — {projectId} — Loading...</p>
    </div>
  );
}
