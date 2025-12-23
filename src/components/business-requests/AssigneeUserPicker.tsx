/**
 * AssigneeUserPicker - A user picker that saves full_name instead of UUID
 * Used for assignee fields where we need to store the name for display
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, User, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AssigneeUserPickerProps {
  value?: string | null;  // This is the full_name, not UUID
  onChange: (fullName: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AssigneeUserPicker({
  value,
  onChange,
  placeholder = 'Select assignee...',
  disabled = false,
  className,
}: AssigneeUserPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users from profiles table
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['user-profiles-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as UserProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Find selected user by full_name
  const selectedUser = useMemo(() => {
    if (!users || !value) return null;
    return users.find((u) => u.full_name === value) || null;
  }, [users, value]);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleSelect = (user: UserProfile) => {
    // Save full_name, not id
    onChange(user.full_name === value ? null : user.full_name);
    setOpen(false);
  };

  const handleUnassign = () => {
    onChange(null);
    setOpen(false);
  };

  const isSelected = (user: UserProfile) => {
    return user.full_name === value;
  };

  // Render trigger content
  const renderTriggerContent = () => {
    if (isLoading) {
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </span>
      );
    }

    if (error) {
      return (
        <span className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          Error loading users
        </span>
      );
    }

    if (!value) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (selectedUser) {
      return (
        <span className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={selectedUser.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-[hsl(var(--secondary-bronze))]/20 text-[hsl(var(--secondary-bronze))]">
              {getInitials(selectedUser.full_name, selectedUser.email)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{selectedUser.full_name || selectedUser.email}</span>
        </span>
      );
    }

    // Value exists but user not found - show value anyway
    return (
      <span className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[10px] bg-[hsl(var(--secondary-bronze))]/20 text-[hsl(var(--secondary-bronze))]">
            {value.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{value}</span>
      </span>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal h-9',
              !value && 'text-muted-foreground'
            )}
          >
            {renderTriggerContent()}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] p-0 z-[500]" 
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or email..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading users...
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-6 text-destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Failed to load users
                </div>
              ) : (
                <>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {value && (
                      <CommandItem
                        value="_unassign"
                        onSelect={handleUnassign}
                        className="cursor-pointer"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground italic">Unassign</span>
                      </CommandItem>
                    )}
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => handleSelect(user)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected(user) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-[hsl(var(--secondary-bronze))]/20 text-[hsl(var(--secondary-bronze))]">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {user.full_name || 'No name'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
