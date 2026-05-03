import { useState } from 'react';
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';

interface IncidentDescriptionProps {
  incidentId: string;
  description?: string;
  isEditMode?: boolean;
  editedDescription?: string;
  onDescriptionChange?: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
}

export function IncidentDescription({
  incidentId,
  description = '',
  isEditMode: initialEditMode = false,
  editedDescription: _,
  onDescriptionChange,
  onSave: externalOnSave,
}: IncidentDescriptionProps) {
  const { description: fetchedDescription, save, isSaving, error } = useCanonicalDescription(
    incidentId,
    'incident'
  );
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [value, setValue] = useState(description || fetchedDescription);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onDescriptionChange?.(newValue);
  };

  const handleSave = async () => {
    if (externalOnSave) {
      await externalOnSave(value);
    } else {
      await save(value);
    }
  };

  return (
    <CanonicalDescriptionField
      workItemId={incidentId}
      workItemType="incident"
      value={value}
      onChange={handleChange}
      onSave={handleSave}
      isEditing={isEditing}
      onEditToggle={setIsEditing}
      isLoading={isSaving}
      error={error?.message}
      maxLength={10000}
      placeholder="Describe the incident in detail..."
      isRequired={false}
    />
  );
}
