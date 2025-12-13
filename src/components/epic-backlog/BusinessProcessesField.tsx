import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  useActiveBusinessProcesses,
  useEpicBusinessProcesses,
  useUpdateEpicBusinessProcesses,
} from '@/hooks/useBusinessProcesses';

interface BusinessProcessesFieldProps {
  epicId: string;
}

export function BusinessProcessesField({ epicId }: BusinessProcessesFieldProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: activeProcesses = [], isLoading: loadingActive } = useActiveBusinessProcesses();
  const { data: epicProcesses = [], isLoading: loadingEpic } = useEpicBusinessProcesses(epicId);
  const updateMutation = useUpdateEpicBusinessProcesses();

  // Initialize selected IDs from epic's current processes
  useEffect(() => {
    if (epicProcesses.length > 0) {
      setSelectedIds(epicProcesses.map((p) => p.id));
    }
  }, [epicProcesses]);

  // Combine active + any inactive but currently linked processes
  const allOptions = [
    ...activeProcesses,
    ...epicProcesses.filter((ep) => !ep.active && !activeProcesses.find((ap) => ap.id === ep.id)),
  ];

  const handleSelect = (processId: string) => {
    const newIds = selectedIds.includes(processId)
      ? selectedIds.filter((id) => id !== processId)
      : [...selectedIds, processId];

    setSelectedIds(newIds);
    updateMutation.mutate({ epicId, businessProcessIds: newIds });
  };

  const handleRemove = (processId: string) => {
    const newIds = selectedIds.filter((id) => id !== processId);
    setSelectedIds(newIds);
    updateMutation.mutate({ epicId, businessProcessIds: newIds });
  };

  const selectedProcesses = allOptions.filter((p) => selectedIds.includes(p.id));

  const isLoading = loadingActive || loadingEpic;

  // Empty state when no business processes are configured
  if (!isLoading && activeProcesses.length === 0 && epicProcesses.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground">Business Processes:</label>
        <div className="flex items-center gap-2 p-3 border border-dashed border-border rounded-md bg-muted/30">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Configure Business Processes in Admin
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-muted-foreground">Business Processes:</label>

      {/* Selected chips */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {selectedProcesses.map((process) => (
          <Badge
            key={process.id}
            variant="secondary"
            className={cn(
              'gap-1 pr-1',
              !process.active && 'opacity-60 line-through'
            )}
          >
            {process.name_en}
            <button
              onClick={() => handleRemove(process.id)}
              className="ml-1 hover:bg-muted rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Multi-select dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-muted-foreground"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Select business processes...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 z-[400]" align="start">
          <Command>
            <CommandInput placeholder="Search business processes..." />
            <CommandList>
              <CommandEmpty>No business process found.</CommandEmpty>
              <CommandGroup>
                {activeProcesses.map((process) => (
                  <CommandItem
                    key={process.id}
                    value={process.name_en}
                    onSelect={() => handleSelect(process.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedIds.includes(process.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {process.name_en}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
