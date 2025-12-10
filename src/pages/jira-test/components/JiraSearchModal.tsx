import React, { useState } from 'react';
import { mockJiraIssues, JiraIssue, issueTypeConfig } from '../data/mockJiraData';

interface JiraSearchModalProps {
  onClose: () => void;
  onSelectIssue: (issue: JiraIssue) => void;
}

export const JiraSearchModal: React.FC<JiraSearchModalProps> = ({ onClose, onSelectIssue }) => {
  const [query, setQuery] = useState('');
  const [recentIssues] = useState(mockJiraIssues.slice(0, 5));

  const searchResults = query
    ? mockJiraIssues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(query.toLowerCase()) ||
          issue.key.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const displayIssues = query ? searchResults : recentIssues;
  const sectionTitle = query ? `Matching Issues (${searchResults.length})` : 'Recent Issues';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[3px] shadow-2xl w-full max-w-[600px] mx-4">
        {/* Search Input */}
        <div className="p-4 border-b border-[#DFE1E6]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B778C]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues by summary or key..."
              autoFocus
              className="w-full pl-10 pr-4 py-3 text-[16px] text-[#172B4D] bg-[#F4F5F7] border border-[#DFE1E6] rounded-[3px] focus:outline-none focus:border-[#4C9AFF] focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wide mb-3">
              {sectionTitle}
            </h3>
            <div className="space-y-1">
              {displayIssues.map((issue) => {
                const typeConfig = issueTypeConfig[issue.type];
                return (
                  <button
                    key={issue.id}
                    onClick={() => onSelectIssue(issue)}
                    className="w-full flex items-center gap-3 p-2 rounded-[3px] hover:bg-[#EBECF0] transition-colors text-left"
                  >
                    {/* Issue Type Icon */}
                    <span
                      className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: typeConfig.bgColor }}
                    >
                      {issue.type === 'story' && (
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill={typeConfig.color}>
                          <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z" />
                        </svg>
                      )}
                      {issue.type === 'task' && (
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill={typeConfig.color}>
                          <path d="M3 3h10v10H3V3zm1 1v8h8V4H4zm1 2h6v1H5V6zm0 2h6v1H5V8zm0 2h4v1H5v-1z" />
                        </svg>
                      )}
                      {issue.type === 'bug' && (
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill={typeConfig.color}>
                          <circle cx="8" cy="8" r="6" />
                        </svg>
                      )}
                    </span>

                    {/* Issue Key */}
                    <span className="text-[13px] text-[#5E6C84] font-medium flex-shrink-0 w-[90px]">
                      {issue.key}
                    </span>

                    {/* Issue Title */}
                    <span className="text-[14px] text-[#172B4D] truncate flex-1">
                      {issue.title}
                    </span>
                  </button>
                );
              })}

              {query && searchResults.length === 0 && (
                <div className="py-8 text-center text-[14px] text-[#5E6C84]">
                  No issues found matching "{query}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#DFE1E6] flex justify-between items-center text-[12px] text-[#5E6C84]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#EBECF0] rounded text-[11px]">↵</kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#EBECF0] rounded text-[11px]">ESC</kbd>
              <span>to close</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#0052CC] hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
