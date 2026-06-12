import Select from '@atlaskit/select';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';

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
}: DepartmentSelectProps) {
  const { data: departments, isLoading } = useDepartments();

  const options = departments?.map((dept) => ({
    label: dept.name,
    value: dept.id,
  })) || [];

  const selectedOption = value ? options.find((opt) => opt.value === value) : null;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(opt) => opt && onChange(opt.value)}
      isDisabled={disabled || isLoading}
      placeholder={isLoading ? 'Loading...' : placeholder}
      maxMenuHeight={288}
      isClearable={false}
      isSearchable
    />
  );
}
