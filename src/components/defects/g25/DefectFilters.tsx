import { useState } from 'react';
import { Search, X, ChevronDown, Check, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { DefectFilters as DefectFiltersType } from '@/types/defects';
import { cn } from '@/lib/utils';

interface Props {
  filters: DefectFiltersType;
  onChange: (f: DefectFiltersType) => void;
  users: { id: string; full_name: string; avatar_url?: string | null }[];
  projects: { id: string; name: string; key: string }[];
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

export function DefectFilters({ filters, onChange, users, projects }: Props) {
  const hasFilters = !!(filters.search || (filters as any).projectId || filters.status?.length || filters.severity?.length || filters.priority?.length || filters.assignedTo);

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

  const AVATAR_COLOURS = ['var(--ds-text-brand, var(--ds-text-brand, #2563EB))', '#0D9488', '#0284C7', 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', '#DB2777'];
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Assignee label for chip display
  const assigneeLabel = filters.assignedTo
    ? filters.assignedTo === 'unassigned'
      ? 'Unassigned'
      : users.find(u => u.id === filters.assignedTo)?.full_name || 'Assignee'
    : 'Assignee';
  const assigneeActive = !!filters.assignedTo;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by title, key, Jira ID..."
          value={filters.search || ''}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-8 h-8 text-[13px] border-slate-200 rounded"
        />
      </div>

      {/* Project */}
      <FilterChip
        label="Project"
        value={(filters as any).projectId}
        options={[
          { value: '', label: 'All Projects' },
          ...projects.map(p => ({ value: p.id, label: `${p.key} — ${p.name}` })),
        ]}
        onSelect={v => onChange({ ...filters, projectId: v } as any)}
        searchable
      />

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

      {/* Assignee — with avatars */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[13px] font-medium transition-colors',
              assigneeActive
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'bg-white border-slate-900/[0.14] text-slate-900 hover:bg-slate-900/[0.04]'
            )}
          >
            {assigneeLabel}
            <ChevronDown className={cn('h-3 w-3', assigneeActive ? 'text-blue-600' : 'text-slate-500')} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-0 bg-white border border-slate-900/[0.12] rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandInput placeholder="Search assignee..." className="h-8 text-[13px]" />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-[13px] text-slate-500">No results</CommandEmpty>
              {/* All Assignees */}
              <CommandItem
                value="All Assignees"
                onSelect={() => onChange({ ...filters, assignedTo: undefined })}
                className="h-9 px-3 text-[13px] text-slate-900 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  {!filters.assignedTo ? <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" /> : <span className="w-3.5 flex-shrink-0" />}
                  All Assignees
                </div>
              </CommandItem>
              {/* Unassigned */}
              <CommandItem
                value="Unassigned"
                onSelect={() => { onChange({ ...filters, assignedTo: 'unassigned' }); }}
                className="h-9 px-3 text-[13px] text-slate-900 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  {filters.assignedTo === 'unassigned' ? <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" /> : <span className="w-3.5 flex-shrink-0" />}
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', border: '1px solid rgba(15,23,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserRound size={12} style={{ color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }} />
                  </div>
                  Unassigned
                </div>
              </CommandItem>
              {/* Users with avatars */}
              {users.map(u => {
                const isSelected = filters.assignedTo === u.id;
                const ini = getInitials(u.full_name);
                const clr = AVATAR_COLOURS[ini.charCodeAt(0) % AVATAR_COLOURS.length];
                return (
                  <CommandItem
                    key={u.id}
                    value={u.full_name}
                    onSelect={() => { onChange({ ...filters, assignedTo: u.id }); }}
                    className="h-9 px-3 text-[13px] text-slate-900 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {isSelected ? <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" /> : <span className="w-3.5 flex-shrink-0" />}
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(15,23,42,0.12)' }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: clr, color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
                      )}
                      {u.full_name}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
