import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Wand2, History, FileText } from 'lucide-react';

const tabs = [
  { 
    id: 'wizard', 
    label: 'Wizard', 
    path: '/operations/requirement-assist',
    icon: Wand2,
    exact: true 
  },
  { 
    id: 'history', 
    label: 'History', 
    path: '/operations/requirement-assist/history',
    icon: History,
    exact: true 
  },
  { 
    id: 'templates', 
    label: 'Templates', 
    path: '/admin/requirement-assist/templates',
    icon: FileText,
    exact: false,
    external: true 
  },
];

export function RANavigationTabs() {
  const location = useLocation();
  
  const isActive = (path: string, exact: boolean) => {
    if (exact) {
      return location.pathname === path || 
        (path === '/operations/requirement-assist' && location.pathname === '/operations/requirement-assist/wizard');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex items-center gap-1 border-b border-[#e2e8f0] bg-white px-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.path, tab.exact);
        
        return (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              active
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a] hover:border-[#e2e8f0]'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
