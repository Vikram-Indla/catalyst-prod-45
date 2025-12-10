import React from 'react';
import { JiraIssue, JiraIssueStatus, statusDisplayNames, issueTypeConfig, priorityConfig } from '../data/mockJiraData';

interface JiraKanbanBoardProps {
  issues: JiraIssue[];
  onIssueClick: (issue: JiraIssue) => void;
}

const columns: JiraIssueStatus[] = ['backlog', 'selected', 'inprogress', 'done'];

export const JiraKanbanBoard: React.FC<JiraKanbanBoardProps> = ({ issues, onIssueClick }) => {
  const getIssuesByStatus = (status: JiraIssueStatus) => {
    return issues.filter(issue => issue.status === status);
  };

  return (
    <div className="p-6 h-full">
      <div className="flex gap-3 h-full">
        {columns.map((status) => {
          const columnIssues = getIssuesByStatus(status);
          return (
            <div
              key={status}
              className="flex-1 min-w-[260px] max-w-[350px] flex flex-col bg-[#F4F5F7] rounded-[3px]"
            >
              {/* Column Header */}
              <div className="px-3 py-3 flex items-center gap-2">
                <h3 className="text-[12px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                  {statusDisplayNames[status]}
                </h3>
                <span className="text-[12px] text-[#5E6C84]">{columnIssues.length}</span>
              </div>

              {/* Column Content */}
              <div className="flex-1 px-2 pb-2 overflow-y-auto space-y-2">
                {columnIssues.map((issue) => (
                  <JiraIssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={() => onIssueClick(issue)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface JiraIssueCardProps {
  issue: JiraIssue;
  onClick: () => void;
}

const JiraIssueCard: React.FC<JiraIssueCardProps> = ({ issue, onClick }) => {
  const typeConfig = issueTypeConfig[issue.type];
  const prioConfig = priorityConfig[issue.priority];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[3px] shadow-sm border border-transparent hover:border-[#4C9AFF] cursor-pointer transition-all group"
    >
      <div className="p-3">
        {/* Title */}
        <p className="text-[14px] text-[#172B4D] leading-[20px] mb-3 line-clamp-3">
          {issue.title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Left - Type + Key + Priority */}
          <div className="flex items-center gap-1">
            {/* Issue Type Icon */}
            <span
              className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px]"
              style={{ backgroundColor: typeConfig.bgColor }}
              title={issue.type}
            >
              {issue.type === 'story' && (
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill={typeConfig.color}>
                  <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z"/>
                </svg>
              )}
              {issue.type === 'task' && (
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill={typeConfig.color}>
                  <path d="M3 3h10v10H3V3zm1 1v8h8V4H4zm1 2h6v1H5V6zm0 2h6v1H5V8zm0 2h4v1H5v-1z"/>
                </svg>
              )}
              {issue.type === 'bug' && (
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill={typeConfig.color}>
                  <circle cx="8" cy="8" r="6"/>
                </svg>
              )}
            </span>

            {/* Issue Key */}
            <span className="text-[12px] text-[#5E6C84] font-medium">{issue.key}</span>

            {/* Priority Icon */}
            <span title={issue.priority}>
              {issue.priority === 'highest' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={prioConfig.color}>
                  <path d="M3 8l5-5 5 5H3zm0 3l5-5 5 5H3z"/>
                </svg>
              )}
              {issue.priority === 'high' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={prioConfig.color}>
                  <path d="M3 10l5-5 5 5H3z"/>
                </svg>
              )}
              {issue.priority === 'medium' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={prioConfig.color}>
                  <path d="M3 7h10v2H3V7z"/>
                </svg>
              )}
              {issue.priority === 'low' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={prioConfig.color}>
                  <path d="M3 6l5 5 5-5H3z"/>
                </svg>
              )}
              {issue.priority === 'lowest' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={prioConfig.color}>
                  <path d="M3 5l5 5 5-5H3zm0 3l5 5 5-5H3z"/>
                </svg>
              )}
            </span>
          </div>

          {/* Right - Assignees */}
          <div className="flex -space-x-1">
            {issue.assignees.slice(0, 3).map((assignee) => (
              <img
                key={assignee.id}
                src={assignee.avatarUrl}
                alt={assignee.name}
                className="w-6 h-6 rounded-full border-2 border-white"
                title={assignee.name}
              />
            ))}
            {issue.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-[#DFE1E6] border-2 border-white flex items-center justify-center text-[10px] text-[#5E6C84] font-medium">
                +{issue.assignees.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
