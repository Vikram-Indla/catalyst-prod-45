/**
 * QA Tester Picker - Filters users to only show those with qa_tester role
 * Consistent with the UserPicker UI used in business requests
 */

import { useState, useMemo } from 'react';
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
import { useQATesters } from '@/hooks/test-management';

interface QATesterPickerProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showUnassigned?: boolean;
}

export function QATesterPicker({
  value,
  onChange,
  placeholder = 'Select QA tester...',
  disabled = false,
  className,
  showUnassigned = true,
}: QATesterPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch QA testers only
  const { data: qaTesters, isLoading, error } = useQATesters();

  // Filter testers based on search query
  const filteredTesters = useMemo(() => {
    if (!qaTesters) return [];
    if (!searchQuery) return qaTesters;

    const query = searchQuery.toLowerCase();
    return qaTesters.filter(
      (tester) =>
        tester.full_name?.toLowerCase().includes(query) ||
        tester.email?.toLowerCase().includes(query)
    );
  }, [qaTesters, searchQuery]);

  // Get selected tester details
  const selectedTester = useMemo(() => {
    if (!qaTesters || !value || value === 'UNASSIGNED') return null;
    return qaTesters.find((t) => t.id === value) || null;
  }, [qaTesters, value]);

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'UN';
  };

  const handleSelect = (testerId: string) => {
    onChange(testerId === value ? null : testerId);
    setOpen(false);
  };

  const handleUnassignedSelect = () => {
    onChange(value === 'UNASSIGNED' ? null : 'UNASSIGNED');
    setOpen(false);
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
          Error loading testers
        </span>
      );
    }

    if (value === 'UNASSIGNED' || !value) {
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          {value === 'UNASSIGNED' ? 'Unassigned' : placeholder}
        </span>
      );
    }

    if (selectedTester) {
      return (
        <span className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={selectedTester.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
              {getInitials(selectedTester.full_name, selectedTester.email)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{selectedTester.full_name || selectedTester.email}</span>
        </span>
      );
    }

    return <span className="text-muted-foreground">{placeholder}</span>;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-[180px] justify-between font-normal h-9',
            'focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {renderTriggerContent()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] p-0 z-[400]" 
        align="start"
        style={{ 
          backgroundColor: 'var(--dialog-section-bg, var(--surface-1))', 
          borderColor: 'var(--dialog-input-border, var(--border-color))',
          boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)'
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search QA testers..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading QA testers...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-6 text-destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                Failed to load QA testers
              </div>
            ) : (
              <>
                <CommandEmpty>No QA testers found.</CommandEmpty>
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
                          value === 'UNASSIGNED' ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground italic">Unassigned</span>
                    </CommandItem>
                  )}
                  {filteredTesters.map((tester) => (
                    <CommandItem
                      key={tester.id}
                      value={tester.id}
                      onSelect={() => handleSelect(tester.id)}
                      className={cn(
                        "cursor-pointer transition-colors py-3 px-4",
                        value === tester.id && "!bg-primary/10 border-l-[3px] border-l-primary"
                      )}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 flex-shrink-0 text-primary',
                          value === tester.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Avatar className="h-9 w-9 mr-3 flex-shrink-0">
                        <AvatarImage src={tester.avatar_url || undefined} />
                        <AvatarFallback 
                          className="text-xs font-semibold bg-primary/15 text-primary"
                        >
                          {getInitials(tester.full_name, tester.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span 
                          className="text-sm font-medium truncate text-foreground"
                        >
                          {tester.full_name || 'No name'}
                        </span>
                        <span 
                          className="text-xs truncate text-muted-foreground"
                        >
                          {tester.email}
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
  );
}
