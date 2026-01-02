/**
 * Fix Version Picker Component
 * Multi-select dropdown for linking issues to versions
 */

import React, { useState, useMemo } from 'react';
import { Check, Package, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useVersions, VersionWithProgress } from '../../hooks/useVersions';

interface FixVersionPickerProps {
  projectId: string | null | undefined;
  selectedVersionIds: string[];
  onVersionsChange: (versionIds: string[]) => void;
  disabled?: boolean;
}

export function FixVersionPicker({
  projectId,
  selectedVersionIds,
  onVersionsChange,
  disabled,
}: FixVersionPickerProps) {
  const [open, setOpen] = useState(false);
  const { versions, isLoading, unreleasedVersions, releasedVersions } = useVersions(projectId);

  const selectedVersions = useMemo(
    () => versions.filter(v => selectedVersionIds.includes(v.id)),
    [versions, selectedVersionIds]
  );

  const handleSelect = (versionId: string) => {
    if (selectedVersionIds.includes(versionId)) {
      onVersionsChange(selectedVersionIds.filter(id => id !== versionId));
    } else {
      onVersionsChange([...selectedVersionIds, versionId]);
    }
  };

  const handleRemove = (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onVersionsChange(selectedVersionIds.filter(id => id !== versionId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-[32px] w-full justify-start text-left font-normal px-2"
          disabled={disabled}
        >
          {selectedVersions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedVersions.map((version) => (
                <Badge
                  key={version.id}
                  variant="secondary"
                  className="text-xs pr-1"
                >
                  {version.name}
                  <button
                    className="ml-1 hover:bg-muted rounded-full"
                    onClick={(e) => handleRemove(version.id, e)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add version
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search versions..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading...' : 'No versions found.'}
            </CommandEmpty>
            
            {unreleasedVersions.length > 0 && (
              <CommandGroup heading="Unreleased">
                {unreleasedVersions.map((version) => (
                  <CommandItem
                    key={version.id}
                    value={version.name}
                    onSelect={() => handleSelect(version.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{version.name}</span>
                    </div>
                    {selectedVersionIds.includes(version.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {releasedVersions.length > 0 && (
              <CommandGroup heading="Released">
                {releasedVersions.map((version) => (
                  <CommandItem
                    key={version.id}
                    value={version.name}
                    onSelect={() => handleSelect(version.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-500" />
                      <span>{version.name}</span>
                    </div>
                    {selectedVersionIds.includes(version.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
