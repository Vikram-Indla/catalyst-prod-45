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
      <SelectTrigger className={cn('bg-background', triggerClassName)}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent className={cn('bg-popover border shadow-lg z-[400]', className)}>
        {departments?.map((dept) => (
          <SelectItem 
            key={dept.id} 
            value={dept.id}
            className="truncate"
          >
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
