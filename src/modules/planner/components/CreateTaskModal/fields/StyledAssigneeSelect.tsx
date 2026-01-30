/**
 * Styled Assignee Select - TaskBoardModal Style
 * Uses Radix Popover with position="popper" for proper anchoring
 */

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, Check, Search, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Colors from TaskBoardModal
const COLORS = {
  textPrimary: '#0f172a',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accentLight: '#dbeafe',
  accent: '#2563eb'
};

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#6b7280', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6'];

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

interface Assignee {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface StyledAssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function StyledAssigneeSelect({ value, onChange }: StyledAssigneeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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

  const filteredUsers = React.useMemo(() => {
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    );
  }, [users, search]);

  // Focus search on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = React.useCallback((user: Assignee) => {
    onChange(user.id);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  return (
    <div className="flex flex-col gap-1.5">
      {/* LABEL */}
      <span 
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: COLORS.textLight }}
      >
        Assignee
      </span>

      {/* RADIX POPOVER */}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 w-full",
              "bg-white border rounded-[10px] cursor-pointer",
              "transition-all duration-150 outline-none text-left",
              "hover:border-slate-300",
              "focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15",
              "data-[state=open]:border-blue-500 data-[state=open]:ring-[3px] data-[state=open]:ring-blue-500/15"
            )}
            style={{ borderColor: COLORS.borderLight }}
          >
            {selected ? (
              <>
                {/* Avatar */}
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(selected.full_name || '') }}
                >
                  {getInitials(selected.full_name || '')}
                </div>
                <span className="flex-1 text-sm font-medium text-slate-900">
                  {selected.full_name}
                </span>
                <X 
                  size={16} 
                  className="text-slate-400 hover:text-slate-600 cursor-pointer" 
                  onClick={handleClear}
                />
              </>
            ) : (
              <>
                <User size={18} className="text-slate-400" />
                <span className="flex-1 text-sm text-slate-400">
                  Unassigned
                </span>
              </>
            )}
            <ChevronDown 
              size={16} 
              className="text-slate-400 transition-transform duration-200 data-[state=open]:rotate-180" 
            />
          </button>
        </PopoverPrimitive.Trigger>

        {/* PORTAL + CONTENT */}
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={{ top: 8, right: 8, bottom: 68, left: 8 }}
            className={cn(
              "bg-white border rounded-xl shadow-xl overflow-hidden",
              "min-w-[240px] w-[var(--radix-popover-trigger-width)]",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
            style={{ 
              borderColor: COLORS.borderDefault,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
              zIndex: 'var(--z-modal-popover, 500)'
            }}
          >
            {/* SEARCH */}
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people..."
                  className={cn(
                    "w-full py-2 pl-9 pr-3",
                    "text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg",
                    "placeholder:text-slate-400",
                    "focus:outline-none focus:border-blue-500"
                  )}
                />
              </div>
            </div>

            {/* OPTIONS */}
            <div className="max-h-[240px] overflow-y-auto p-1.5">
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
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left",
                      "transition-colors duration-100",
                      user.id === value 
                        ? "bg-blue-50" 
                        : "hover:bg-slate-100"
                    )}
                  >
                    {/* Avatar */}
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(user.full_name || '') }}
                    >
                      {getInitials(user.full_name || '')}
                    </div>
                    
                    {/* Name + Email */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {user.full_name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {user.email}
                      </div>
                    </div>
                    
                    {/* Check */}
                    {user.id === value && (
                      <Check size={16} className="text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
