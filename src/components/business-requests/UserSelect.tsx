/**
 * UserSelect - Reusable user selection component with avatar display
 * Shows user avatar + name, fetches from profiles table
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface UserSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showUnassigned?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UserSelect({ 
  value, 
  onChange, 
  placeholder = 'Select user',
  className,
  disabled = false,
  showUnassigned = true
}: UserSelectProps) {
  // Fetch all active profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles-for-user-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return (data || []) as UserProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Find selected user's display info
  const selectedUser = profiles.find(p => p.id === value || p.full_name === value);
  const displayName = selectedUser?.full_name || selectedUser?.email || value;

  return (
    <Select 
      value={value || 'unassigned'} 
      onValueChange={(v) => onChange(v === 'unassigned' ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-9", className)}>
        {value && displayName ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="bg-[hsl(var(--secondary-bronze))] text-white text-[10px] font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{displayName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent className="z-[500] bg-popover">
        {showUnassigned && (
          <SelectItem value="unassigned">
            <span className="text-muted-foreground">Not assigned</span>
          </SelectItem>
        )}
        {profiles.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="bg-[hsl(var(--secondary-bronze))] text-white text-[10px] font-semibold">
                  {getInitials(user.full_name || user.email)}
                </AvatarFallback>
              </Avatar>
              <span>{user.full_name || user.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
