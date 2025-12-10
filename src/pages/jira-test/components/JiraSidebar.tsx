import React from 'react';
import { JiraProject } from '../data/mockJiraData';

interface JiraSidebarProps {
  project: JiraProject;
}

export const JiraSidebar: React.FC<JiraSidebarProps> = ({ project }) => {
  const menuItems = [
    { icon: 'kanban', label: 'Kanban Board', active: true },
    { icon: 'settings', label: 'Project Settings', active: false },
  ];

  const bottomMenuItems = [
    { icon: 'releases', label: 'Releases' },
    { icon: 'filters', label: 'Issues and filters' },
    { icon: 'pages', label: 'Pages' },
    { icon: 'reports', label: 'Reports' },
    { icon: 'components', label: 'Components' },
  ];

  return (
    <div className="w-[230px] bg-[#F4F5F7] border-r border-[#DFE1E6] flex flex-col">
      {/* Project Header */}
      <div className="p-4 border-b border-[#DFE1E6]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[3px] bg-gradient-to-br from-[#FF5630] to-[#FFAB00] flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-medium text-[#172B4D] truncate">{project.name}</h3>
            <p className="text-[12px] text-[#6B778C]">{project.category}</p>
          </div>
        </div>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 py-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            className={`w-full flex items-center gap-3 px-4 py-2 text-[14px] transition-colors ${
              item.active 
                ? 'bg-[#E4F0F6] text-[#0052CC] font-medium' 
                : 'text-[#42526E] hover:bg-[#EBECF0]'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {item.icon === 'kanban' && (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              )}
              {item.icon === 'settings' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </span>
            {item.label}
          </button>
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-[#DFE1E6]" />

        {/* Bottom Menu */}
        {bottomMenuItems.map((item, index) => (
          <button
            key={index}
            className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-[#42526E] hover:bg-[#EBECF0] transition-colors"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {item.icon === 'releases' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {item.icon === 'filters' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              )}
              {item.icon === 'pages' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {item.icon === 'reports' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {item.icon === 'components' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              )}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
