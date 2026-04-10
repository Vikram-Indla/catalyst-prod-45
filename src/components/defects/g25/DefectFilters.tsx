import { useState, useRef } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { DefectFilters as DefectFiltersType } from '@/types/defects';
import { cn } from '@/lib/utils';

interface Props {
  filters: DefectFiltersType;
  onChange: (f: DefectFiltersType) => void;
  users: { id: string; full_name: string; avatar_url?: string | null }[];
}

// ── Filter chip pill component ──
function FilterChip({
  label,
  value,
  options,
  onSelect,
  searchable = false,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onSelect: (value: string | undefined) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isActive = !!value;
  const displayLabel = value
    ? options.find(o => o.value === value)?.label || label
    : label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[13px] font-medium transition-colors',
            isActive
              ? 'bg-blue-50 border-blue-600 text-blue-600'
              : 'bg-white border-slate-900/[0.14] text-slate-900 hover:bg-slate-900/[0.04]'
          )}
        >
          {displayLabel}
          <ChevronDown className={cn('h-3 w-3', isActive ? 'text-blue-600' : 'text-slate-500')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-0 bg-white border border-slate-900/[0.12] rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]"
        align="start"
        sideOffset={4}
      >
        <Command>
          {searchable && <CommandInput placeholder={`Search ${label.toLowerCase()}...`} className="h-8 text-[13px]" />}
          <CommandList>
            <CommandEmpty className="py-3 text-center text-[13px] text-slate-500">No results</CommandEmpty>
            {options.map(opt => {
              const isSelected = value === opt.value;
              return (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onSelect(opt.value === '' ? undefined : opt.value);
                    setOpen(false);
                  }}
                  className="h-8 px-3 text-[13px] text-slate-900 cursor-pointer hover:bg-slate-900/[0.04]"
                >
                  <div className="flex items-center gap-2 w-full">
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 flex-shrink-0" />
                    )}
                    {opt.label}
                  </div>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function DefectFilters({ filters, onChange, users }: Props) {
  const hasFilters = !!(filters.search || filters.status?.length || filters.severity?.length || filters.priority?.length || filters.assignedTo);

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'fixed', label: 'Fixed' },
    { value: 'verified', label: 'Verified' },
    { value: 'closed', label: 'Closed' },
    { value: 'reopened', label: 'Reopened' },
    { value: 'deferred', label: 'Deferred' },
  ];

  const severityOptions = [
    { value: '', label: 'All Severity' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priority' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const assigneeOptions = [
    { value: '', label: 'All Assignees' },
    { value: 'unassigned', label: 'Unassigned' },
    ...users.map(u => ({ value: u.id, label: u.full_name })),
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by title, key, Jira ID..."
          value={filters.search || ''}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-8 h-8 text-[13px] border-slate-200 rounded"
        />
      </div>

      {/* Status */}
      <FilterChip
        label="Status"
        value={filters.status?.[0]}
        options={statusOptions}
        onSelect={v => onChange({ ...filters, status: v ? [v as any] : undefined })}
      />

      {/* Severity */}
      <FilterChip
        label="Severity"
        value={filters.severity?.[0]}
        options={severityOptions}
        onSelect={v => onChange({ ...filters, severity: v ? [v as any] : undefined })}
      />

      {/* Priority */}
      <FilterChip
        label="Priority"
        value={filters.priority?.[0]}
        options={priorityOptions}
        onSelect={v => onChange({ ...filters, priority: v ? [v as any] : undefined })}
      />

      {/* Assignee */}
      <FilterChip
        label="Assignee"
        value={filters.assignedTo}
        options={assigneeOptions}
        onSelect={v => onChange({ ...filters, assignedTo: v || undefined })}
        searchable
      />

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => onChange({})}
          className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
