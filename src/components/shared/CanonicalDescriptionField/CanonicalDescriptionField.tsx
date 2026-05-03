import React, { useState, useCallback, useMemo } from 'react';
import type {
  CanonicalDescriptionFieldProps,
  DescriptionMention,
} from './description.types';
import { DescriptionViewMode } from './DescriptionViewMode';
import { DescriptionEditMode } from './DescriptionEditMode';
import { validateDescription } from './DescriptionValidation';

export function CanonicalDescriptionField({
  workItemId,
  workItemType,
  value,
  onChange,
  onSave,
  onCancel,
  onEditToggle,
  isEditing = false,
  placeholder = 'Add a description...',
  error,
  isLoading = false,
  isRequired = false,
  minLength = 0,
  maxLength = 10000,
  validator,
  readOnly = false,
}: CanonicalDescriptionFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [localError, setLocalError] = useState<string | undefined>(error);
  const [mentions, setMentions] = useState<DescriptionMention[]>([]);

  // Parse mentions from value
  useMemo(() => {
    const parsed = parseMentions(localValue);
    setMentions(parsed);
  }, [localValue]);

  const charCount = localValue.length;
  const charPercentage = (charCount / maxLength) * 100;
  const isNearLimit = charPercentage > 80;

  // Handle text change
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      // Client-side validation
      const validation = validator
        ? validator(newValue)
        : validateDescription(newValue, { minLength, maxLength, isRequired });

      if (!validation.valid) {
        setLocalError(validation.error);
      } else {
        setLocalError(undefined);
      }

      onChange(newValue);
    },
    [onChange, validator, minLength, maxLength, isRequired]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (onSave) {
      try {
        await onSave(localValue);
        onEditToggle?.(false);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Save failed');
      }
    }
  }, [localValue, onSave, onEditToggle]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setLocalValue(value);
    setLocalError(undefined);
    onCancel?.();
    onEditToggle?.(false);
  }, [value, onCancel, onEditToggle]);

  // Handle edit toggle
  const handleEditToggle = useCallback(() => {
    onEditToggle?.(!isEditing);
  }, [isEditing, onEditToggle]);

  if (readOnly) {
    return <DescriptionViewMode value={value} mentions={mentions} />;
  }

  return (
    <div className="space-y-3">
      {isEditing ? (
        <DescriptionEditMode
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          charCount={charCount}
          isNearLimit={isNearLimit}
          error={localError}
          isLoading={isLoading}
          mentions={mentions}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <DescriptionViewMode
          value={value}
          mentions={mentions}
          onEdit={handleEditToggle}
        />
      )}

      {/* Validation Error Display */}
      {localError && !isEditing && (
        <div className="text-sm text-red-600 dark:text-red-400">{localError}</div>
      )}
    </div>
  );
}

// Parse mentions in text
function parseMentions(text: string): DescriptionMention[] {
  const mentions: DescriptionMention[] = [];

  // Match @username pattern
  const userMentionRegex = /@([a-zA-Z0-9_\-]+)/g;
  let match;
  while ((match = userMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: 'user',
      display: match[0],
      reference: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  while ((match = urlRegex.exec(text)) !== null) {
    mentions.push({
      type: 'url',
      display: match[0],
      reference: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}
