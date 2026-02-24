import { useParams } from 'react-router-dom';
import { useJiraBacklogIssues } from '@/hooks/useJiraBacklogIssues';
import { JiraBacklogTable } from '@/components/project-hub/backlog/JiraBacklogTable';
import { Loader2 } from 'lucide-react';

export default function ProjectStoryBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const { data: issues = [], isLoading } = useJiraBacklogIssues(key, 'story');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading Story Backlog...
      </div>
    );
  }

  return <JiraBacklogTable issues={issues} title="Story Backlog" showParent />;
}
