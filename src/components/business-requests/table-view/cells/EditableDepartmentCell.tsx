/**
 * EditableDepartmentCell — Inline editable department cell with dropdown picker
 */

import { useState, useRef, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableDepartmentCellProps {
  department: string | null;
  requestId: string;
  onSave: (requestId: string, department: string | null) => Promise<void>;
  disabled?: boolean;
}

export function EditableDepartmentCell({ department, requestId, onSave, disabled = false }: EditableDepartmentCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: departments = [] } = useDepartments();

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (selectedDepartment: string | null) => {
    if (disabled || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(requestId, selectedDepartment);
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Failed to save department:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const departmentDisplay = (
    <span className={cn(
      "text-sm truncate block max-w-full cursor-pointer transition-colors",
      department ? "text-foreground" : "text-muted-foreground",
      !disabled && "hover:text-brand-primary"
    )}>
      {department || '—'}
    </span>
  );

  if (disabled) {
    return departmentDisplay;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="text-left w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {departmentDisplay}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 shadow-lg z-[100] bg-popover border-border"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background"
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearch('');
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          {department && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left hover:bg-muted"
              onClick={() => handleSelect(null)}
              disabled={isSaving}
            >
              <span className="text-muted-foreground">Clear</span>
            </button>
          )}
          
          {filteredDepartments.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No departments found
            </div>
          ) : (
            filteredDepartments.map((dept) => {
              const isSelected = department === dept.name;
              
              return (
                <button
                  key={dept.id}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors text-left',
                    'hover:bg-muted',
                    isSelected && 'bg-muted'
                  )}
                  onClick={() => handleSelect(dept.name)}
                  disabled={isSaving}
                >
                  <span className="text-foreground truncate">{dept.name}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-brand-primary flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}