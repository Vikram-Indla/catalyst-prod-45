import React from 'react';
import { useParams } from 'react-router-dom';

export default function StoryBacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <p>Story Backlog — {projectId} — Loading...</p>
    </div>
  );
}
