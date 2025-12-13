import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessOwners, useDepartmentOwnerMappings, getOwnerIdForDepartment } from '@/hooks/useDepartmentsAndOwners';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface BusinessOwnerSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  departmentId: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  autoSetFromDepartment?: boolean;
}

export function BusinessOwnerSelect({
  value,
  onChange,
  departmentId,
  placeholder = 'Select business owner...',
  disabled = false,
  className,
  triggerClassName,
  autoSetFromDepartment = true,
}: BusinessOwnerSelectProps) {
  const { data: owners, isLoading } = useBusinessOwners();
  const { data: mappings } = useDepartmentOwnerMappings();

  // Auto-set owner when department changes (1:1 mapping)
  useEffect(() => {
    if (autoSetFromDepartment && departmentId && mappings) {
      const mappedOwnerId = getOwnerIdForDepartment(departmentId, mappings);
      if (mappedOwnerId && mappedOwnerId !== value) {
        onChange(mappedOwnerId);
      }
    }
  }, [departmentId, mappings, autoSetFromDepartment, onChange, value]);

  // Get the mapped owner for filtering (currently 1:1, so only show mapped owner)
  const mappedOwnerId = departmentId ? getOwnerIdForDepartment(departmentId, mappings) : null;
  
  // Filter owners: if department is selected, only show the mapped owner
  const filteredOwners = departmentId && mappedOwnerId
    ? owners?.filter(o => o.id === mappedOwnerId)
    : owners;

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
        {filteredOwners?.map((owner) => (
          <SelectItem 
            key={owner.id} 
            value={owner.id}
          >
            {owner.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
