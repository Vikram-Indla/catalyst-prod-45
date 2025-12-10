import React, { useState } from 'react';
import { JiraIssue, issueTypeConfig, priorityConfig, mockJiraUsers } from '../data/mockJiraData';

interface JiraIssueDetailProps {
  issue: JiraIssue;
  onClose: () => void;
}

export const JiraIssueDetail: React.FC<JiraIssueDetailProps> = ({ issue, onClose }) => {
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description);
  const [comment, setComment] = useState('');
  const typeConfig = issueTypeConfig[issue.type];
  const prioConfig = priorityConfig[issue.priority];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-[3px] shadow-xl w-full max-w-[1040px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE1E6]">
          <div className="flex items-center gap-2">
            {/* Issue Type */}
            <span
              className="w-5 h-5 rounded-sm flex items-center justify-center"
              style={{ backgroundColor: typeConfig.bgColor }}
            >
              {issue.type === 'story' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={typeConfig.color}>
                  <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z"/>
                </svg>
              )}
              {issue.type === 'task' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={typeConfig.color}>
                  <path d="M3 3h10v10H3V3zm1 1v8h8V4H4zm1 2h6v1H5V6zm0 2h6v1H5V8zm0 2h4v1H5v-1z"/>
                </svg>
              )}
              {issue.type === 'bug' && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill={typeConfig.color}>
                  <circle cx="8" cy="8" r="6"/>
                </svg>
              )}
            </span>
            <span className="text-[14px] text-[#5E6C84] font-medium hover:underline cursor-pointer">
              {issue.key}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-[#6B778C] hover:bg-[#EBECF0] rounded transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button className="p-2 text-[#6B778C] hover:bg-[#EBECF0] rounded transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button className="p-2 text-[#6B778C] hover:bg-[#EBECF0] rounded transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-[#6B778C] hover:bg-[#EBECF0] rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex">
          {/* Left Panel - Main Content */}
          <div className="flex-1 p-6 pr-8">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[22px] font-medium text-[#172B4D] border-none outline-none focus:bg-[#EBECF0] px-2 py-1 -ml-2 rounded transition-colors"
            />

            {/* Description */}
            <div className="mt-6">
              <h4 className="text-[14px] font-semibold text-[#172B4D] mb-2">Description</h4>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="w-full min-h-[100px] p-3 text-[14px] text-[#172B4D] bg-[#F4F5F7] border border-[#DFE1E6] rounded-[3px] focus:outline-none focus:border-[#4C9AFF] focus:bg-white resize-none"
              />
            </div>

            {/* Comments */}
            <div className="mt-8">
              <h4 className="text-[14px] font-semibold text-[#172B4D] mb-4">Comments</h4>
              
              {/* Add Comment */}
              <div className="flex gap-3 mb-4">
                <img
                  src={mockJiraUsers[0].avatarUrl}
                  alt="Your avatar"
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div className="flex-1">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-3 text-[14px] text-[#172B4D] bg-[#F4F5F7] border border-[#DFE1E6] rounded-[3px] focus:outline-none focus:border-[#4C9AFF] focus:bg-white resize-none min-h-[80px]"
                  />
                  {comment && (
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1.5 bg-[#0052CC] text-white text-[14px] font-medium rounded-[3px] hover:bg-[#0065FF] transition-colors">
                        Save
                      </button>
                      <button 
                        onClick={() => setComment('')}
                        className="px-3 py-1.5 text-[14px] text-[#42526E] hover:bg-[#EBECF0] rounded-[3px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Comments */}
              {issue.comments.map((c) => (
                <div key={c.id} className="flex gap-3 mb-4">
                  <img
                    src={c.user.avatarUrl}
                    alt={c.user.name}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-medium text-[#172B4D]">{c.user.name}</span>
                      <span className="text-[12px] text-[#5E6C84]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[14px] text-[#172B4D]">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className="w-[300px] p-6 border-l border-[#DFE1E6] bg-[#F4F5F7]">
            {/* Status */}
            <div className="mb-6">
              <label className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wide">Status</label>
              <button className="mt-1 w-full flex items-center justify-between px-3 py-2 bg-[#0052CC] text-white text-[14px] font-medium rounded-[3px] hover:bg-[#0065FF] transition-colors">
                <span className="uppercase">{issue.status.replace('inprogress', 'In Progress')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Assignees */}
            <div className="mb-6">
              <label className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wide">Assignees</label>
              <div className="mt-2 space-y-2">
                {issue.assignees.map((assignee) => (
                  <div key={assignee.id} className="flex items-center gap-2">
                    <img
                      src={assignee.avatarUrl}
                      alt={assignee.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-[14px] text-[#172B4D]">{assignee.name}</span>
                  </div>
                ))}
                <button className="flex items-center gap-2 text-[14px] text-[#0052CC] hover:underline">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add more
                </button>
              </div>
            </div>

            {/* Reporter */}
            <div className="mb-6">
              <label className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wide">Reporter</label>
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={issue.reporter.avatarUrl}
                  alt={issue.reporter.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-[14px] text-[#172B4D]">{issue.reporter.name}</span>
              </div>
            </div>

            {/* Priority */}
            <div className="mb-6">
              <label className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wide">Priority</label>
              <div className="mt-2 flex items-center gap-2">
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
                <span className="text-[14px] text-[#172B4D] capitalize">{issue.priority}</span>
              </div>
            </div>

            {/* Estimate */}
            {issue.estimate && (
              <div className="mb-6">
                <label className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wide">Original Estimate (hours)</label>
                <div className="mt-2 text-[14px] text-[#172B4D]">{issue.estimate}h</div>
              </div>
            )}

            {/* Dates */}
            <div className="pt-4 border-t border-[#DFE1E6] text-[12px] text-[#5E6C84] space-y-1">
              <div>Created {new Date(issue.createdAt).toLocaleDateString()}</div>
              <div>Updated {new Date(issue.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
