import React, { useState } from 'react';
import { JiraSidebar } from './components/JiraSidebar';
import { JiraNavbar } from './components/JiraNavbar';
import { JiraKanbanBoard } from './components/JiraKanbanBoard';
import { JiraIssueDetail } from './components/JiraIssueDetail';
import { JiraSearchModal } from './components/JiraSearchModal';
import { mockJiraProject, mockJiraIssues, JiraIssue } from './data/mockJiraData';

export const JiraCloneTestPage: React.FC = () => {
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMyIssues, setFilterMyIssues] = useState(false);
  const [filterIgnoreResolved, setFilterIgnoreResolved] = useState(false);

  const filteredIssues = mockJiraIssues.filter(issue => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        issue.title.toLowerCase().includes(query) ||
        issue.key.toLowerCase().includes(query)
      );
    }
    if (filterMyIssues) {
      return issue.assignees.some(a => a.id === 'user-1');
    }
    if (filterIgnoreResolved) {
      return issue.status !== 'done';
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-[#0747A6]">
      {/* Left Icon Bar */}
      <div className="w-16 bg-[#0747A6] flex flex-col items-center py-4 gap-4">
        <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.5 2L2 7.5V16.5L11.5 22L21 16.5V7.5L11.5 2Z"/>
          </svg>
        </div>
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="w-10 h-10 text-white/70 hover:text-white hover:bg-white/10 rounded flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button className="w-10 h-10 text-white/70 hover:text-white hover:bg-white/10 rounded flex items-center justify-center transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <div className="flex-1" />
        <button className="w-10 h-10 text-white/70 hover:text-white hover:bg-white/10 rounded flex items-center justify-center transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Main Sidebar */}
      <JiraSidebar project={mockJiraProject} />

      {/* Main Content */}
      <div className="flex-1 bg-[#F4F5F7] overflow-hidden flex flex-col">
        <JiraNavbar 
          project={mockJiraProject}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterMyIssues={filterMyIssues}
          onFilterMyIssuesChange={setFilterMyIssues}
          filterIgnoreResolved={filterIgnoreResolved}
          onFilterIgnoreResolvedChange={setFilterIgnoreResolved}
        />
        
        <div className="flex-1 overflow-auto">
          <JiraKanbanBoard 
            issues={filteredIssues}
            onIssueClick={setSelectedIssue}
          />
        </div>
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <JiraIssueDetail 
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <JiraSearchModal 
          onClose={() => setIsSearchOpen(false)}
          onSelectIssue={(issue) => {
            setSelectedIssue(issue);
            setIsSearchOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default JiraCloneTestPage;
