import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, User, X, Loader2, AlertCircle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserPickerProps {
  value?: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  multiSelect?: boolean;
  disabled?: boolean;
  className?: string;
  showUnassigned?: boolean;
}

export function UserPicker({
  value,
  onChange,
  placeholder = 'Select user...',
  multiSelect = false,
  disabled = false,
  className,
  showUnassigned = false,
}: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users from profiles table
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as UserProfile[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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

  // Get selected user(s) details
  const selectedUsers = useMemo(() => {
    if (!users || !value) return [];
    
    if (multiSelect && Array.isArray(value)) {
      return users.filter((u) => value.includes(u.id));
    } else if (typeof value === 'string' && value !== 'UNASSIGNED') {
      const user = users.find((u) => u.id === value);
      return user ? [user] : [];
    }
    return [];
  }, [users, value, multiSelect]);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleSelect = (userId: string) => {
    if (multiSelect) {
      const currentValue = Array.isArray(value) ? value : [];
      if (currentValue.includes(userId)) {
        onChange(currentValue.filter((v) => v !== userId));
      } else {
        onChange([...currentValue, userId]);
      }
    } else {
      onChange(userId === value ? null : userId);
      setOpen(false);
    }
  };

  const handleUnassignedSelect = () => {
    if (multiSelect) {
      const currentValue = Array.isArray(value) ? value : [];
      if (currentValue.includes('UNASSIGNED')) {
        onChange(currentValue.filter((v) => v !== 'UNASSIGNED'));
      } else {
        onChange([...currentValue, 'UNASSIGNED']);
      }
    } else {
      onChange(value === 'UNASSIGNED' ? null : 'UNASSIGNED');
      setOpen(false);
    }
  };

  const handleRemove = (userId: string) => {
    if (multiSelect && Array.isArray(value)) {
      onChange(value.filter((v) => v !== userId));
    } else {
      onChange(null);
    }
  };

  const isSelected = (userId: string) => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(userId);
    }
    return value === userId;
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

    if (value === 'UNASSIGNED') {
      return (
        <span className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Unassigned
        </span>
      );
    }

    if (selectedUsers.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (!multiSelect && selectedUsers.length === 1) {
      const user = selectedUsers[0];
      return (
        <span className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-brand-gold/20 text-brand-gold">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{user.full_name || user.email}</span>
        </span>
      );
    }

    return <span className="text-muted-foreground">{placeholder}</span>;
  };

  return (
    <div className={cn('space-y-2', className)}>
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
        <PopoverContent className="w-[300px] p-0" align="start">
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
                    {showUnassigned && (
                      <CommandItem
                        value="UNASSIGNED"
                        onSelect={handleUnassignedSelect}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected('UNASSIGNED') ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground italic">Unassigned</span>
                      </CommandItem>
                    )}
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => handleSelect(user.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected(user.id) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-brand-gold/20 text-brand-gold">
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

      {/* Multi-select chips */}
      {multiSelect && selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(value) && value.includes('UNASSIGNED') && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 pr-1 bg-muted text-muted-foreground"
            >
              Unassigned
              <button
                type="button"
                onClick={() => handleRemove('UNASSIGNED')}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="h-6 gap-1 pr-1 bg-brand-gold/10 text-brand-gold border-brand-gold/20"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-brand-gold/20 text-brand-gold">
                  {getInitials(user.full_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate">
                {user.full_name || user.email}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(user.id)}
                className="ml-1 rounded-full hover:bg-brand-gold/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
