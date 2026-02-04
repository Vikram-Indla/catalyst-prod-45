// ═══════════════════════════════════════════════════════════════════════════════
// T10 ASSIGNEE FILTER DROPDOWN
// Multi-select filter for assignees
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { User, ChevronDown, Check, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface T10AssigneeFilterProps {
  selected: string[];
  onChange: (assignees: string[]) => void;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

function getAvatarColor(name: string | null): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500'
  ];
  const str = name || 'default';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function T10AssigneeFilter({ selected, onChange }: T10AssigneeFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: profiles = [] } = useQuery({
    queryKey: ['t10-profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: 60000,
  });

  const filteredProfiles = profiles.filter(p => {
    const searchLower = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(searchLower) ||
      p.email?.toLowerCase().includes(searchLower)
    );
  });

  const toggleAssignee = (userId: string) => {
    if (selected.includes(userId)) {
      onChange(selected.filter(id => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  const selectedCount = selected.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border rounded-lg transition-all ${
            selectedCount > 0
              ? 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
              : 'text-slate-600 bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
          }`}
        >
          <User size={14} />
          Assigned To
          {selectedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-full">
              {selectedCount}
            </span>
          )}
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b border-slate-100">
          <Input
            placeholder="Search assignees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-2">
          {filteredProfiles.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              No assignees found
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => toggleAssignee(profile.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  selected.includes(profile.id)
                    ? 'bg-blue-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(profile.full_name)}`}
                  >
                    {getInitials(profile.full_name, profile.email)}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {profile.full_name || 'Unknown'}
                  </div>
                  {profile.email && (
                    <div className="text-xs text-slate-500 truncate">
                      {profile.email}
                    </div>
                  )}
                </div>
                {selected.includes(profile.id) && (
                  <Check size={16} className="text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
        {selectedCount > 0 && (
          <div className="p-2 border-t border-slate-100">
            <button
              onClick={clearAll}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md"
            >
              <X size={14} />
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
