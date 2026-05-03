import { useState, useEffect } from 'react';
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';

interface TaskDescriptionProps {
  taskId: string;
  value?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
}

export function TaskDescription({
  taskId,
  value: externalValue = '',
  onChange,
  onSave: externalOnSave,
}: TaskDescriptionProps) {
  const { description: fetchedDescription, save, isSaving, error } = useCanonicalDescription(
    taskId,
    'task'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(externalValue || fetchedDescription);

  useEffect(() => {
    setValue(externalValue || fetchedDescription);
  }, [externalValue, fetchedDescription]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  const handleSave = async () => {
    if (externalOnSave) {
      await externalOnSave(value);
    } else {
      await save(value);
    }
  };

  return (
    <div className="space-y-3">
      <CanonicalDescriptionField
        workItemId={taskId}
        workItemType="task"
        value={value}
        onChange={handleChange}
        onSave={handleSave}
        isEditing={isEditing}
        onEditToggle={setIsEditing}
        isLoading={isSaving}
        error={error?.message}
        maxLength={10000}
        placeholder="Add a description... (Type @ to mention someone)"
        isRequired={false}
      />
    </div>
  );
}
