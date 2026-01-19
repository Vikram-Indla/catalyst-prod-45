import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
import { cn } from '@/lib/utils';

interface DepartmentSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = 'Select department...',
  disabled = false,
  className,
  triggerClassName,
}: DepartmentSelectProps) {
  const { data: departments, isLoading } = useDepartments();

  return (
    <SelectPrimitive.Root 
      value={value || ''} 
      onValueChange={onChange}
      disabled={disabled || isLoading}
    >
      <SelectPrimitive.Trigger 
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input',
          'bg-white dark:bg-gray-900 px-3 py-2 text-sm',
          'placeholder:text-muted-foreground',
          'hover:bg-muted transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          triggerClassName,
          className
        )}
      >
        <SelectPrimitive.Value placeholder={isLoading ? 'Loading...' : placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            'relative z-[99999] max-h-96 min-w-[8rem] overflow-hidden rounded-md border',
            'bg-popover text-popover-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
            'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1',
            'data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1'
          )}
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport
            className={cn(
              'p-1 overflow-y-auto overscroll-contain max-h-72',
              'w-full min-w-[var(--radix-select-trigger-width)]'
            )}
            style={{ WebkitOverflowScrolling: 'touch' }}
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {departments && departments.length > 0 ? (
              departments.map((dept) => (
                <SelectPrimitive.Item
                  key={dept.id}
                  value={dept.id}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center',
                    'rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    'focus:bg-accent focus:text-accent-foreground'
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{dept.name}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))
            ) : (
              <div className="py-2 px-3 text-sm text-muted-foreground">
                {isLoading ? 'Loading departments...' : 'No departments available'}
              </div>
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
