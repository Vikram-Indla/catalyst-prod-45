import React from 'react';
import { JiraProject, mockJiraUsers } from '../data/mockJiraData';

interface JiraNavbarProps {
  project: JiraProject;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterMyIssues: boolean;
  onFilterMyIssuesChange: (value: boolean) => void;
  filterIgnoreResolved: boolean;
  onFilterIgnoreResolvedChange: (value: boolean) => void;
}

export const JiraNavbar: React.FC<JiraNavbarProps> = ({
  project,
  searchQuery,
  onSearchChange,
  filterMyIssues,
  onFilterMyIssuesChange,
  filterIgnoreResolved,
  onFilterIgnoreResolvedChange,
}) => {
  return (
    <div className="bg-white border-b border-[#DFE1E6]">
      {/* Breadcrumb */}
      <div className="px-6 pt-4 pb-2">
        <nav className="text-[13px] text-[#5E6C84]">
          <span className="hover:underline cursor-pointer">Projects</span>
          <span className="mx-1">/</span>
          <span className="hover:underline cursor-pointer">{project.name}</span>
          <span className="mx-1">/</span>
          <span className="text-[#42526E]">Kanban Board</span>
        </nav>
      </div>

      {/* Title */}
      <div className="px-6 pb-4">
        <h1 className="text-[24px] font-medium text-[#172B4D]">Kanban board</h1>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[180px] h-[32px] pl-8 pr-3 bg-[#F4F5F7] border border-[#DFE1E6] rounded-[3px] text-[14px] text-[#172B4D] placeholder-[#7A869A] focus:outline-none focus:border-[#4C9AFF] focus:bg-white transition-colors"
          />
          <svg 
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* User Avatars */}
        <div className="flex -space-x-1">
          {mockJiraUsers.map((user) => (
            <button
              key={user.id}
              className="relative z-10 hover:z-20 transition-transform hover:scale-110"
              title={user.name}
            >
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-white"
              />
            </button>
          ))}
        </div>

        {/* Filter Buttons */}
        <button
          onClick={() => onFilterMyIssuesChange(!filterMyIssues)}
          className={`px-3 h-[32px] rounded-[3px] text-[14px] font-medium transition-colors ${
            filterMyIssues
              ? 'bg-[#E4F0F6] text-[#0052CC]'
              : 'text-[#42526E] hover:bg-[#EBECF0]'
          }`}
        >
          Only My Issues
        </button>

        <button
          onClick={() => onFilterIgnoreResolvedChange(!filterIgnoreResolved)}
          className={`px-3 h-[32px] rounded-[3px] text-[14px] font-medium transition-colors ${
            filterIgnoreResolved
              ? 'bg-[#E4F0F6] text-[#0052CC]'
              : 'text-[#42526E] hover:bg-[#EBECF0]'
          }`}
        >
          Ignore Resolved
        </button>

        {(searchQuery || filterMyIssues || filterIgnoreResolved) && (
          <button
            onClick={() => {
              onSearchChange('');
              onFilterMyIssuesChange(false);
              onFilterIgnoreResolvedChange(false);
            }}
            className="px-3 h-[32px] text-[14px] text-[#42526E] hover:text-[#172B4D] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};
