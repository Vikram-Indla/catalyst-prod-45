import React from "react";
import type { WorkItemIconType } from "@/types/notifications";
import { JiraIssueTypeIcon } from "@/lib/jira-issue-type-icons";

const NOTIFICATION_ICON_TYPE_MAP: Record<WorkItemIconType, string> = {
  bug: 'Bug',
  'qa bug': 'QA Bug',
  story: 'Story',
  task: 'Task',
  epic: 'Epic',
  subtask: 'Sub-task',
  new_feature: 'New Feature',
  improvement: 'Improvement',
  incident: 'Incident',
  question: 'Question',
};

export const WORK_ITEM_ICONS: Record<WorkItemIconType, React.FC> = {
  bug: () => <WorkItemIcon type="bug" />,
  story: () => <WorkItemIcon type="story" />,
  task: () => <WorkItemIcon type="task" />,
  epic: () => <WorkItemIcon type="epic" />,
  subtask: () => <WorkItemIcon type="subtask" />,
  new_feature: () => <WorkItemIcon type="new_feature" />,
  improvement: () => <WorkItemIcon type="improvement" />,
  incident: () => <WorkItemIcon type="incident" />,
  question: () => <WorkItemIcon type="question" />,
};

export function WorkItemIcon({ type }: { type: WorkItemIconType }) {
  return (
    <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <JiraIssueTypeIcon type={NOTIFICATION_ICON_TYPE_MAP[type] ?? 'Task'} size={14} />
    </span>
  );
}
