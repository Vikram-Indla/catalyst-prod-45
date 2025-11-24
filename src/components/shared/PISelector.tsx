import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PISelectorProps {
  portfolioId?: string;
  value: string[];
  onChange: (value: string[]) => void;
  multiSelect?: boolean;
}

export function PISelector({ portfolioId, value, onChange, multiSelect = true }: PISelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: pis, isLoading } = useQuery({
    queryKey: ['program-increments', portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId,
  });

  const selectedPIs = pis?.filter(pi => value.includes(pi.id)) || [];

  const handleSelect = (piId: string) => {
    if (multiSelect) {
      const newValue = value.includes(piId)
        ? value.filter(id => id !== piId)
        : [...value, piId];
      onChange(newValue);
    } else {
      onChange([piId]);
      setOpen(false);
    }
  };

  const removePI = (piId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(id => id !== piId));
  };

  const getStateBadgeVariant = (state: string) => {
    switch (state) {
      case 'active': return 'default';
      case 'planned': return 'secondary';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          <div className="flex gap-1 flex-wrap overflow-hidden">
            {selectedPIs.length === 0 ? (
              <span className="text-muted-foreground">Select PI(s)...</span>
            ) : (
              selectedPIs.map(pi => (
                <Badge key={pi.id} variant={getStateBadgeVariant(pi.state || 'planned')} className="gap-1">
                  {pi.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={(e) => removePI(pi.id, e)}
                  />
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search PI..." />
          <CommandEmpty>No PI found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {pis?.map((pi) => (
              <CommandItem
                key={pi.id}
                value={pi.name}
                onSelect={() => handleSelect(pi.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(pi.id) ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex-1">{pi.name}</span>
                <Badge variant={getStateBadgeVariant(pi.state || 'planned')} className="ml-2">
                  {pi.state || 'planned'}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
