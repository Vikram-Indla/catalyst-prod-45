/**
 * Spaces Mega Menu — Full-featured navigation hub
 * Four columns: Current Context, Work Items, Recent, Quick Actions
 * Keyboard navigable (Arrow keys, Enter, Escape)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  Briefcase, 
  FolderKanban,
  Zap,
  Package,
  BookOpen,
  CheckSquare,
  Search,
  Plus,
  Clock,
  ChevronRight,
  AlertTriangle,
  X,
  Target,
} from 'lucide-react';
import { useSpacesScope, ScopeLevel } from './SpacesScopeContext';

interface SpacesMegaMenuProps {
  open: boolean;
  onClose: () => void;
}

// Hierarchy items with scope requirements
const WORK_ITEM_TYPES = [
  { 
    type: 'epic', 
    label: 'Epics', 
    icon: Zap, 
    scope: 'program' as ScopeLevel,
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    textColor: 'text-violet-600 dark:text-violet-400',
    path: '/spaces/backlog?scope=program',
  },
  { 
    type: 'feature', 
    label: 'Features', 
    icon: Package, 
    scope: 'project' as ScopeLevel,
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    textColor: 'text-teal-600 dark:text-teal-400',
    path: '/spaces/backlog?scope=project&type=feature',
  },
  { 
    type: 'story', 
    label: 'Stories', 
    icon: BookOpen, 
    scope: 'project' as ScopeLevel,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    path: '/spaces/backlog?scope=project&type=story',
  },
  { 
    type: 'subtask', 
    label: 'Subtasks', 
    icon: CheckSquare, 
    scope: 'project' as ScopeLevel,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    path: '/spaces/backlog?scope=project&type=subtask',
  },
];

// Mock recent items
const RECENT_ITEMS = [
  { key: 'EPIC-1247', title: 'Customer Authentication Flow', type: 'epic', viewedAgo: '2 hours ago' },
  { key: 'FEAT-892', title: 'Dashboard Analytics Widget', type: 'feature', viewedAgo: '4 hours ago' },
  { key: 'STORY-1189', title: 'User Profile Settings Page', type: 'story', viewedAgo: '6 hours ago' },
  { key: 'EPIC-1156', title: 'API Gateway Integration', type: 'epic', viewedAgo: 'Yesterday' },
  { key: 'FEAT-743', title: 'Notification System', type: 'feature', viewedAgo: 'Yesterday' },
];

// Mock hierarchy context
const HIERARCHY_CONTEXT = {
  enterprise: { id: 'ent-1', name: 'Ministry of Industry', icon: Building2 },
  program: { id: 'prog-1', name: 'Digital Transformation', icon: Briefcase },
  project: { id: 'proj-1', name: 'Catalyst Platform', icon: FolderKanban },
};

export function SpacesMegaMenu({ open, onClose }: SpacesMegaMenuProps) {
  const navigate = useNavigate();
  const { currentScope, setScope, getScopeLabel } = useSpacesScope();
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeWarning, setScopeWarning] = useState<{ type: string; requiredScope: ScopeLevel } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!open) return;

    switch (event.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, WORK_ITEM_TYPES.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < WORK_ITEM_TYPES.length) {
          handleWorkItemClick(WORK_ITEM_TYPES[focusedIndex]);
        }
        break;
    }
  }, [open, focusedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search on open
      setTimeout(() => searchRef.current?.focus(), 100);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const handleWorkItemClick = (item: typeof WORK_ITEM_TYPES[0]) => {
    // Check scope mismatch
    if (item.scope !== currentScope) {
      if (item.scope === 'program' && currentScope === 'project') {
        setScopeWarning({ type: item.type, requiredScope: 'program' });
        return;
      }
      if (item.scope === 'project' && currentScope === 'program') {
        setScopeWarning({ type: item.type, requiredScope: 'project' });
        return;
      }
    }
    
    setScopeWarning(null);
    navigate(item.path);
    onClose();
  };

  const handleSwitchScope = () => {
    if (scopeWarning) {
      setScope(scopeWarning.requiredScope);
      setScopeWarning(null);
    }
  };

  const handleQuickCreate = (type: string, scope: ScopeLevel) => {
    if (scope !== currentScope) {
      setScope(scope);
    }
    navigate(`/spaces/backlog?scope=${scope}&create=${type}`);
    onClose();
  };

  const handleContextClick = (scope: ScopeLevel) => {
    setScope(scope);
    setScopeWarning(null);
  };

  const filteredRecent = RECENT_ITEMS.filter(item =>
    searchQuery === '' ||
    item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic': return Zap;
      case 'feature': return Package;
      case 'story': return BookOpen;
      case 'subtask': return CheckSquare;
      default: return Target;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'epic': return 'text-violet-600 dark:text-violet-400';
      case 'feature': return 'text-teal-600 dark:text-teal-400';
      case 'story': return 'text-green-600 dark:text-green-400';
      case 'subtask': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div 
      ref={menuRef}
      className="absolute top-full left-0 mt-2 w-[720px] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
      role="menu"
      aria-label="Spaces navigation menu"
    >
      {/* Header with Search */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Navigate Spaces</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by key or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
          />
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
                {scopeWarning.type.charAt(0).toUpperCase() + scopeWarning.type.slice(1)}s are managed at {scopeWarning.requiredScope} level.
                You are currently in {currentScope} scope.
              </p>
              <button
                onClick={handleSwitchScope}
                className="mt-2 px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
              >
                Switch to {scopeWarning.requiredScope}
              </button>
            </div>
            <button onClick={() => setScopeWarning(null)} className="text-amber-600 hover:text-amber-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Four Column Grid */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-border min-h-[280px]">
        {/* Column 1: Current Context */}
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Current Context
          </p>
          <div className="space-y-1">
            {/* Enterprise */}
            <button
              onClick={() => handleContextClick('enterprise')}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                currentScope === 'enterprise' 
                  ? "bg-violet-100 dark:bg-violet-900/30 ring-1 ring-violet-500" 
                  : "hover:bg-muted"
              )}
            >
              <Building2 className={cn("w-4 h-4", currentScope === 'enterprise' ? "text-violet-600" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{HIERARCHY_CONTEXT.enterprise.name}</p>
                <p className="text-[10px] text-muted-foreground">Enterprise</p>
              </div>
            </button>

            {/* Program */}
            <button
              onClick={() => handleContextClick('program')}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                currentScope === 'program' 
                  ? "bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-500" 
                  : "hover:bg-muted"
              )}
            >
              <Briefcase className={cn("w-4 h-4", currentScope === 'program' ? "text-blue-600" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{HIERARCHY_CONTEXT.program.name}</p>
                <p className="text-[10px] text-muted-foreground">Program</p>
              </div>
              {currentScope === 'program' && (
                <span className="text-[9px] font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">ACTIVE</span>
              )}
            </button>

            {/* Project */}
            <button
              onClick={() => handleContextClick('project')}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                currentScope === 'project' 
                  ? "bg-emerald-100 dark:bg-emerald-900/30 ring-1 ring-emerald-500" 
                  : "hover:bg-muted"
              )}
            >
              <FolderKanban className={cn("w-4 h-4", currentScope === 'project' ? "text-emerald-600" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{HIERARCHY_CONTEXT.project.name}</p>
                <p className="text-[10px] text-muted-foreground">Project</p>
              </div>
              {currentScope === 'project' && (
                <span className="text-[9px] font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">ACTIVE</span>
              )}
            </button>
          </div>
        </div>

        {/* Column 2: Work Items */}
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Work Items
          </p>
          <div className="space-y-1">
            {WORK_ITEM_TYPES.map((item, index) => {
              const Icon = item.icon;
              const isFocused = focusedIndex === index;
              
              return (
                <button
                  key={item.type}
                  onClick={() => handleWorkItemClick(item)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all",
                    "hover:bg-muted",
                    isFocused && "ring-2 ring-primary bg-primary/5"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", item.bgColor)}>
                    <Icon className={cn("w-3.5 h-3.5", item.textColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{item.scope} scope</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 3: Recent */}
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Recent
          </p>
          <div className="space-y-0.5">
            {filteredRecent.slice(0, 5).map(item => {
              const Icon = getTypeIcon(item.type);
              
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    navigate(`/work-items/${item.key}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left group"
                >
                  <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", getTypeColor(item.type))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-primary">{item.key}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{item.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredRecent.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No recent items</p>
          )}
        </div>

        {/* Column 4: Quick Actions */}
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Quick Actions
          </p>
          <div className="space-y-1">
            <button
              onClick={() => handleQuickCreate('epic', 'program')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Plus className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Create Epic</p>
                <p className="text-[10px] text-muted-foreground">→ Program scope</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickCreate('feature', 'project')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Plus className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Create Feature</p>
                <p className="text-[10px] text-muted-foreground">→ Project scope</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickCreate('story', 'project')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Plus className="w-3 h-3 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Create Story</p>
                <p className="text-[10px] text-muted-foreground">→ Project scope</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickCreate('subtask', 'project')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors group"
            >
              <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Plus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Create Subtask</p>
                <p className="text-[10px] text-muted-foreground">→ Project scope</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-muted/30 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Use <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">↑↓</kbd> to navigate, 
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono ml-1">Enter</kbd> to select, 
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono ml-1">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
