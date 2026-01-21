/**
 * Top Navigation Bar
 * Spaces button, Create, Search, Notifications, Theme, User
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  ChevronDown, 
  Plus, 
  Search, 
  Bell, 
  Moon, 
  Sun,
} from 'lucide-react';
import { SpacesMegaMenu } from './SpacesMegaMenu';
import { ScopeLevel, WorkItemType } from '../../types';

interface TopNavBarProps {
  currentScope: ScopeLevel;
  onScopeChange: (scope: ScopeLevel) => void;
  onNavigate: (type: WorkItemType) => void;
  onCreateClick: () => void;
}

export function TopNavBar({ 
  currentScope, 
  onScopeChange, 
  onNavigate,
  onCreateClick,
}: TopNavBarProps) {
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {/* Spaces Button */}
        <div className="relative">
          <button
            onClick={() => setSpacesOpen(!spacesOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              spacesOpen
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
            aria-expanded={spacesOpen}
            aria-label="Open Spaces navigation menu"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Spaces</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", spacesOpen && "rotate-180")} />
          </button>

          <SpacesMegaMenu
            open={spacesOpen}
            onClose={() => setSpacesOpen(false)}
            onNavigate={onNavigate}
            currentScope={currentScope}
            onScopeChange={onScopeChange}
          />
        </div>

        {/* Create Button */}
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          aria-label="Create new item"
        >
          <Plus className="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>
        
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        
        <button
          className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center ml-2"
          aria-label="User profile"
        >
          VK
        </button>
      </div>
    </header>
  );
}
