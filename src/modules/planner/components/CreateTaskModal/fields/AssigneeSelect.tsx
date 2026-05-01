/**
 * Assignee Select - Per V4 Spec
 * Searchable assignee dropdown with avatars
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Assignee {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface AssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Avatar color utility
const AVATAR_COLORS = ['var(--ds-text-brand, #2563eb)', '#0d9488', '#6b7280', '#8b5cf6', '#f97316'];
function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AssigneeSelect({ value, onChange, className }: AssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch users from profiles
  const { data: users = [] } = useQuery({
    queryKey: ['create-task-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      
      if (error) throw error;
      return data as Assignee[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const selected = users.find(u => u.id === value);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    );
  }, [users, search]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (user: Assignee) => {
    onChange(user.id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        Assignee
      </label>
      
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-[42px] flex items-center gap-2 px-3",
          "text-sm bg-white dark:bg-slate-900 border rounded-lg",
          "cursor-pointer transition-all",
          isOpen
            ? "border-blue-600 ring-2 ring-blue-600/10"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selected ? (
          <>
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: getAvatarColor(selected.full_name || '') }}
            >
              {getInitials(selected.full_name || '')}
            </div>
            <span className="text-slate-900 dark:text-slate-100 flex-1 text-left truncate">
              {selected.full_name}
            </span>
          </>
        ) : (
          <span className="text-slate-400 flex-1 text-left">Select assignee...</span>
        )}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={cn(
            "absolute top-full left-0 right-0 mt-1 z-[1000]",
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg",
            "shadow-lg shadow-black/10 dark:shadow-black/30",
            "overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          )}
          role="listbox"
        >
          {/* Search */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className={cn(
                  "w-full pl-9 pr-3 py-2",
                  "text-sm text-slate-900 dark:text-slate-100",
                  "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg",
                  "placeholder:text-slate-400",
                  "focus:border-blue-600 focus:outline-none transition-colors"
                )}
              />
            </div>
          </div>

          {/* Options */}
          <div 
            className="max-h-[220px] overflow-y-auto p-1.5 overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                No results found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md",
                    "text-left transition-colors",
                    user.id === value
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                  role="option"
                  aria-selected={user.id === value}
                >
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(user.full_name || '') }}
                  >
                    {getInitials(user.full_name || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {user.full_name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {user.email}
                    </div>
                  </div>
                  {user.id === value && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
