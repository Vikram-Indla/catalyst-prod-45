import { useState } from 'react';
import { Check, ChevronDown, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';

interface InlineAssigneeSelectProps {
  value: string | null;
  assignee?: { id: string; full_name?: string; avatar_url?: string } | null;
  onChange: (assigneeId: string | null) => void;
}

export function InlineAssigneeSelect({ value, assignee, onChange }: InlineAssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: users = [] } = usePlannerUsers();

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleSelect = (userId: string | null) => {
    onChange(userId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setSearch('');
    }}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm hover:bg-accent transition-colors"
        >
          {assignee ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-semibold">
                {getInitials(assignee.full_name)}
              </div>
              <span className="text-foreground/80 truncate max-w-[100px]">
                {assignee.full_name}
              </span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">Unassigned</span>
            </>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-2 bg-white dark:bg-slate-900 border border-border shadow-lg" 
        align="start"
        style={{ zIndex: 99999, backgroundColor: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
        />
        <div 
          className="max-h-48 overflow-y-auto overscroll-contain space-y-0.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {/* Unassign option */}
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
              !value ? "bg-accent" : "hover:bg-accent"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <X className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground">Unassigned</span>
            {!value && <Check className="w-4 h-4 text-primary ml-auto" />}
          </button>

          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
                user.id === value ? "bg-accent" : "hover:bg-accent"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-semibold">
                {user.initials}
              </div>
              <span className="flex-1 truncate">{user.name}</span>
              {user.id === value && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}

          {filteredUsers.length === 0 && search && (
            <p className="text-center text-sm text-muted-foreground py-2">
              No users found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
