import { useState } from 'react';
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';

interface DescriptionEditorProps {
  backlogItemId: string;
  initialValue?: string;
  onChange?: (value: string) => void;
}

export function DescriptionEditor({
  backlogItemId,
  initialValue = '',
  onChange
}: DescriptionEditorProps) {
  const { description, save, isSaving, error } = useCanonicalDescription(
    backlogItemId,
    'task'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description || initialValue);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  const handleSave = async () => {
    await save(value);
  };

  return (
    <CanonicalDescriptionField
      workItemId={backlogItemId}
      workItemType="task"
      value={value}
      onChange={handleChange}
      onSave={handleSave}
      isEditing={isEditing}
      onEditToggle={setIsEditing}
      isLoading={isSaving}
      error={error?.message}
      maxLength={10000}
      placeholder="Add a description to this backlog item..."
      isRequired={false}
    />
  );
}
