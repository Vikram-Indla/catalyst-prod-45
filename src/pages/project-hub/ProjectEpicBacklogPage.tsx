import { useParams } from 'react-router-dom';
import { useJiraBacklogIssues } from '@/hooks/useJiraBacklogIssues';
import { JiraBacklogTable } from '@/components/project-hub/backlog/JiraBacklogTable';
import { Loader2 } from 'lucide-react';

export default function ProjectEpicBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const { data: issues = [], isLoading } = useJiraBacklogIssues(key, 'epic');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading Epic Backlog...
      </div>
    );
  }

  return <JiraBacklogTable issues={issues} title="Epic Backlog" />;
}
