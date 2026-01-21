/**
 * Spaces Mega Menu — Navigation with scope switching
 * Hierarchy grid, search, recent items
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Mountain, 
  Puzzle, 
  Bookmark, 
  CheckSquare, 
  Search,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { TYPE_CONFIG, ScopeLevel, WorkItemType } from '../../types';
import { recentItems } from '../../data/sampleData';

interface SpacesMegaMenuProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (type: WorkItemType) => void;
  currentScope: ScopeLevel;
  onScopeChange: (scope: ScopeLevel) => void;
}

const SCOPE_PILLS: { value: ScopeLevel; label: string }[] = [
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'program', label: 'Program' },
  { value: 'project', label: 'Project' },
];

const TYPE_ICONS = {
  epic: Mountain,
  feature: Puzzle,
  story: Bookmark,
  subtask: CheckSquare,
};

export function SpacesMegaMenu({ 
  open, 
  onClose, 
  onNavigate,
  currentScope,
  onScopeChange,
}: SpacesMegaMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeWarning, setScopeWarning] = useState<{ type: WorkItemType; requiredScope: ScopeLevel } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleTypeClick = (type: WorkItemType) => {
    const config = TYPE_CONFIG[type];
    
    // Check scope mismatch
    if (type === 'epic' && currentScope === 'project') {
      setScopeWarning({ type, requiredScope: 'program' });
      return;
    }
    
    setScopeWarning(null);
    onNavigate(type);
    onClose();
  };

  const handleSwitchScope = () => {
    if (scopeWarning) {
      onScopeChange(scopeWarning.requiredScope);
      setScopeWarning(null);
    }
  };

  const filteredRecent = recentItems.filter(item => 
    searchQuery === '' || 
    item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      ref={menuRef}
      className="absolute top-full left-0 mt-1 w-[560px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[10px] shadow-lg z-50"
      role="menu"
      aria-label="Spaces navigation menu"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Navigate Spaces</h3>
        <div className="flex items-center gap-1">
          {SCOPE_PILLS.map(pill => (
            <button
              key={pill.value}
              onClick={() => {
                onScopeChange(pill.value);
                setScopeWarning(null);
              }}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                currentScope === pill.value
                  ? "bg-blue-600 text-white"
                  : "bg-transparent text-slate-400 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scope Warning Banner */}
      {scopeWarning && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Scope Mismatch</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {TYPE_CONFIG[scopeWarning.type].label}s belong to {scopeWarning.requiredScope} scope. 
                You are currently in {currentScope} scope.
              </p>
              <button
                onClick={handleSwitchScope}
                className="mt-2 px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
              >
                Switch to {scopeWarning.requiredScope}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {(['epic', 'feature', 'story', 'subtask'] as WorkItemType[]).map(type => {
            const config = TYPE_CONFIG[type];
            const Icon = TYPE_ICONS[type];
            
            return (
              <button
                key={type}
                onClick={() => handleTypeClick(type)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                  "bg-slate-100 dark:bg-slate-700/50",
                  "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:ring-1 hover:ring-blue-500"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center",
                  config.bgColor
                )}>
                  <Icon className={cn("w-4 h-4", config.textColor)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{config.label}s</p>
                  <p className="text-xs text-slate-400 capitalize">{config.scope} scope</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by key or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 border-0 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Recent Items */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Recent</p>
        <div className="space-y-0.5">
          {filteredRecent.slice(0, 5).map(item => {
            const config = TYPE_CONFIG[item.type];
            const Icon = TYPE_ICONS[item.type];
            
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.type);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <Icon className={cn("w-3.5 h-3.5", config.textColor)} />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{item.key}</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1">{item.title}</span>
                <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
