/**
 * UserSelect - Reusable user selection component with avatar display
 * Shows user avatar + name, fetches APPROVED users with real-time sync
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useActiveUsers } from '@/hooks/useActiveUsers';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface UserSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showUnassigned?: boolean;
  /** Whether to save full_name (for assignee) or id (for requestor). Default: 'name' */
  saveAs?: 'name' | 'id';
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
  showUnassigned = true,
  saveAs = 'name'
}: UserSelectProps) {
  // Fetch APPROVED users with real-time sync
  const { data: activeUsers = [], isLoading } = useActiveUsers();
  
  // Transform to expected format
  const profiles: UserProfile[] = activeUsers.map(u => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    avatar_url: u.avatar_url,
  }));

  // Find selected user's display info - match by id OR full_name for compatibility
  const selectedUser = profiles.find(p => p.id === value || p.full_name === value);
  const displayName = selectedUser?.full_name || selectedUser?.email || value;

  // Get the value to use for the select item (id or full_name based on saveAs)
  const getItemValue = (user: UserProfile) => {
    if (saveAs === 'name') {
      return user.full_name || user.email || user.id;
    }
    return user.id;
  };

  // Get current select value (must match an item value)
  const getCurrentValue = () => {
    if (!value) return 'unassigned';
    // Find matching user and return the appropriate value format
    const user = profiles.find(p => p.id === value || p.full_name === value);
    if (user) {
      return getItemValue(user);
    }
    return value; // Return as-is for backwards compatibility
  };

  const handleChange = (v: string) => {
    if (v === 'unassigned') {
      onChange(null);
      return;
    }
    // v will be either id or full_name based on saveAs
    onChange(v);
  };

  return (
    <Select 
      value={getCurrentValue()} 
      onValueChange={handleChange}
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
          <SelectItem key={user.id} value={getItemValue(user)}>
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
