import { useParams } from 'react-router-dom';
import { useJiraBacklogIssues } from '@/hooks/useJiraBacklogIssues';
import { JiraBacklogTable } from '@/components/project-hub/backlog/JiraBacklogTable';
import { Loader2 } from 'lucide-react';

export default function ProjectFeatureBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const { data: issues = [], isLoading } = useJiraBacklogIssues(key, 'feature');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading Feature Backlog...
      </div>
    );
  }

  return <JiraBacklogTable issues={issues} title="Feature Backlog" showParent />;
}
