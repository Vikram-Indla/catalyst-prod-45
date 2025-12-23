import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <Select 
      value={value || ''} 
      onValueChange={onChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn('bg-white dark:bg-gray-900 border-input', triggerClassName)}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent 
        className={cn('bg-popover border shadow-lg', className)}
        style={{ zIndex: 99999 }}
        position="popper"
        sideOffset={4}
      >
        {departments && departments.length > 0 ? (
          departments.map((dept) => (
            <SelectItem 
              key={dept.id} 
              value={dept.id}
              className="truncate"
            >
              {dept.name}
            </SelectItem>
          ))
        ) : (
          <div className="py-2 px-3 text-sm text-muted-foreground">
            {isLoading ? 'Loading departments...' : 'No departments available'}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
