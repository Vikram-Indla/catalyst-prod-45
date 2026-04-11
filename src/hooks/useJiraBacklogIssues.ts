export interface JiraBacklogIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee?: string;
  [key: string]: any;
}

export function useJiraBacklogIssues() {
  return { data: [] as JiraBacklogIssue[], isLoading: false };
}
