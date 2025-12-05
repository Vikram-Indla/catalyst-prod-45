import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
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

interface BusinessOwnerPickerProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BusinessOwnerPicker({
  value = [],
  onChange,
  placeholder = 'Search business owners...',
  disabled = false,
  className,
}: BusinessOwnerPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch distinct business_owner values from business_requests
  const { data: businessOwners, isLoading } = useQuery({
    queryKey: ['distinct-business-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('business_owner')
        .not('business_owner', 'is', null)
        .not('business_owner', 'eq', '');

      if (error) throw error;

      // Get unique values
      const uniqueOwners = [...new Set(data.map(d => d.business_owner).filter(Boolean))] as string[];
      return uniqueOwners.sort();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter business owners based on search query
  const filteredOwners = useMemo(() => {
    if (!businessOwners) return [];
    if (!searchQuery) return businessOwners;

    const query = searchQuery.toLowerCase();
    return businessOwners.filter(owner =>
      owner.toLowerCase().includes(query) ||
      owner.toLowerCase().startsWith(query)
    );
  }, [businessOwners, searchQuery]);

  const handleSelect = (owner: string) => {
    const currentValue = value || [];
    if (currentValue.includes(owner)) {
      const newValue = currentValue.filter(v => v !== owner);
      onChange(newValue.length > 0 ? newValue : undefined);
    } else {
      onChange([...currentValue, owner]);
    }
  };

  const handleRemove = (owner: string) => {
    const newValue = (value || []).filter(v => v !== owner);
    onChange(newValue.length > 0 ? newValue : undefined);
  };

  const isSelected = (owner: string) => (value || []).includes(owner);

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
              (!value || value.length === 0) && 'text-muted-foreground'
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : value && value.length > 0 ? (
              <span className="truncate">{value.length} selected</span>
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {searchQuery ? 'No matching business owners found.' : 'No business owners in system.'}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredOwners.map((owner) => (
                      <CommandItem
                        key={owner}
                        value={owner}
                        onSelect={() => handleSelect(owner)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected(owner) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{owner}</span>
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
      {value && value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((owner) => (
            <Badge
              key={owner}
              variant="secondary"
              className="h-6 gap-1 pr-1 bg-brand-gold/10 text-brand-gold border-brand-gold/20"
            >
              <span className="max-w-[120px] truncate">{owner}</span>
              <button
                type="button"
                onClick={() => handleRemove(owner)}
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
