/**
 * InlineReleasePicker — Inline release version selection
 * 
 * Features:
 * - Click to edit activation
 * - Dropdown with release versions
 * - Optimistic update with rollback on error
 * - Keyboard navigation (Esc to cancel)
 */

import { useState } from 'react';
import { ChevronDown, X, Package } from 'lucide-react';
import { useReleaseVersions } from '@/hooks/useIncidents';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ReleaseVersion } from '@/types/incident';

interface InlineReleasePickerProps {
  value: ReleaseVersion | null | undefined;
  onSave: (releaseId: string | null) => Promise<void>;
  disabled?: boolean;
  textSize?: string;
}

export function InlineReleasePicker({
  value,
  onSave,
  disabled = false,
  textSize = 'text-[12px]',
}: InlineReleasePickerProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: releases = [] } = useReleaseVersions();

  const handleSelect = async (releaseId: string | null) => {
    if (disabled || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(releaseId);
      setOpen(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  if (disabled) {
    return (
      <div className={cn(textSize, 'text-muted-foreground cursor-not-allowed truncate text-center')}>
        {value?.version || '—'}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center justify-center gap-1 rounded px-1 py-0.5 hover:bg-muted/80 transition-colors cursor-pointer',
            textSize
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className={value ? 'text-[var(--text-2)] truncate' : 'text-[var(--text-3)]'}>
            {value?.version || '—'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-0 bg-[var(--surface-1)] border-[var(--border-color)]"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-1 max-h-60 overflow-y-auto">
          {/* Clear option */}
          {value && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors text-left"
              onClick={() => handleSelect(null)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 text-[var(--text-3)]" />
              <span className="text-[var(--text-2)]">Clear</span>
            </button>
          )}
          
          {/* Release list */}
          {releases.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[var(--text-3)]">
              No releases available
            </div>
          ) : (
            releases.map((release) => (
              <button
                key={release.id}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors text-left',
                  value?.id === release.id && 'bg-[var(--surface-2)]'
                )}
                onClick={() => handleSelect(release.id)}
                disabled={isSaving}
              >
                <Package className="h-4 w-4 text-[var(--text-3)]" />
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--text-1)] truncate">{release.version}</div>
                  {release.name && (
                    <div className="text-[10px] text-[var(--text-3)] truncate">{release.name}</div>
                  )}
                </div>
                {release.status && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded font-medium',
                    release.status === 'active' && 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
                    release.status === 'released' && 'bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400',
                    release.status === 'planned' && 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
                  )}>
                    {release.status}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
