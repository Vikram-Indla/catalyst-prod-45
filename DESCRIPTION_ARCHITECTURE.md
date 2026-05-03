# CANONICAL DESCRIPTION FIELD ARCHITECTURE
**Catalyst Platform — ADS-Compliant, Jira-Parity Implementation**

---

## 1. COMPONENT HIERARCHY

```
src/components/shared/
  ├── CanonicalDescriptionField/
  │   ├── CanonicalDescriptionField.tsx      (main export)
  │   ├── DescriptionViewMode.tsx             (read-only display)
  │   ├── DescriptionEditMode.tsx             (edit with controls)
  │   ├── DescriptionToolbar.tsx              (formatting + actions)
  │   ├── DescriptionValidation.ts            (schema validation)
  │   └── description.types.ts                (TypeScript interfaces)
  │
  ├── hooks/
  │   ├── useCanonicalDescription.ts          (data + mutations)
  │   ├── useDescriptionValidation.ts         (client-side validation)
  │   └── useDescriptionMentions.ts           (mention parsing/suggest)
  │
  └── lib/
      ├── descriptionApi.ts                   (Supabase queries)
      ├── descriptionSchema.ts                (Zod/validation schema)
      └── mentionEngine.ts                    (URL + @user detection)
```

---

## 2. CORE COMPONENT: CanonicalDescriptionField

### Type Definitions

```typescript
// src/components/shared/CanonicalDescriptionField/description.types.ts

export type WorkItemType = 'task' | 'feature' | 'incident' | 'epic' | 'story';

export interface DescriptionConfig {
  workItemId: string;
  workItemType: WorkItemType;
  maxLength: number;
  minLength: number;
  isRequired: boolean;
  placeholder: string;
  readOnly?: boolean;
}

export interface DescriptionState {
  value: string;
  isEditing: boolean;
  isDirty: boolean;
  error?: string;
  isLoading: boolean;
  charCount: number;
}

export interface CanonicalDescriptionFieldProps extends DescriptionConfig {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
  onCancel?: () => void;
  onEditToggle?: (editing: boolean) => void;
  isEditing?: boolean;
  error?: string;
  isLoading?: boolean;
  validator?: (value: string) => { valid: boolean; error?: string };
}

export interface DescriptionMention {
  type: 'user' | 'team' | 'url' | 'hashtag';
  display: string;
  reference: string;
  startIndex: number;
  endIndex: number;
}
```

### Main Component

```typescript
// src/components/shared/CanonicalDescriptionField/CanonicalDescriptionField.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { TextArea } from '@atlaskit/textarea';
import { Button } from '@atlaskit/button';
import { HelperMessage, ErrorMessage } from '@atlaskit/form';
import EditIcon from '@atlaskit/icon/glyph/edit';
import CheckIcon from '@atlaskit/icon/glyph/check';
import CloseIcon from '@atlaskit/icon/glyph/close';
import { DescriptionViewMode } from './DescriptionViewMode';
import { DescriptionEditMode } from './DescriptionEditMode';
import { validateDescription } from './DescriptionValidation';
import type {
  CanonicalDescriptionFieldProps,
  DescriptionState,
  DescriptionMention,
} from './description.types';

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
  const handleChange = useCallback((newValue: string) => {
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
  }, [onChange, validator, minLength, maxLength, isRequired]);

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
        />
      ) : (
        <DescriptionViewMode
          value={value}
          mentions={mentions}
          onEdit={handleEditToggle}
        />
      )}

      {/* Validation Error Display (ADS ErrorMessage) */}
      {localError && !isEditing && (
        <ErrorMessage>{localError}</ErrorMessage>
      )}

      {/* Character Counter (ADS HelperMessage) */}
      {isEditing && (
        <HelperMessage>
          {charCount} / {maxLength} characters
          {isNearLimit && ' — Approaching limit'}
        </HelperMessage>
      )}

      {/* Action Buttons (Edit Mode) */}
      {isEditing && (
        <div className="flex gap-2 justify-end">
          <Button
            appearance="subtle"
            onClick={handleCancel}
            isDisabled={isLoading}
            iconBefore={<CloseIcon label="Cancel" />}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSave}
            isLoading={isLoading}
            iconBefore={<CheckIcon label="Save" />}
          >
            Save
          </Button>
        </div>
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
```

### View Mode Component

```typescript
// src/components/shared/CanonicalDescriptionField/DescriptionViewMode.tsx

import React from 'react';
import { Button } from '@atlaskit/button';
import EditIcon from '@atlaskit/icon/glyph/edit';
import type { DescriptionMention } from './description.types';

interface DescriptionViewModeProps {
  value: string;
  mentions: DescriptionMention[];
  onEdit?: () => void;
}

export function DescriptionViewMode({
  value,
  mentions,
  onEdit,
}: DescriptionViewModeProps) {
  if (!value) {
    return (
      <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No description provided.
          </p>
          {onEdit && (
            <Button
              appearance="subtle"
              onClick={onEdit}
              iconBefore={<EditIcon label="Edit" />}
            >
              Add
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-start justify-between gap-3">
        <div className="prose prose-sm dark:prose-invert flex-1">
          {renderMarkdown(value, mentions)}
        </div>
        {onEdit && (
          <Button
            appearance="subtle"
            onClick={onEdit}
            iconBefore={<EditIcon label="Edit" />}
            size="small"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function renderMarkdown(
  text: string,
  mentions: DescriptionMention[]
): React.ReactNode {
  // Basic markdown rendering: **bold**, _italic_, `code`
  let rendered = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  // Render mentions as links
  mentions.forEach((mention) => {
    if (mention.type === 'url') {
      rendered = rendered.replace(
        mention.reference,
        `<a href="${mention.reference}" target="_blank">${mention.display}</a>`
      );
    } else if (mention.type === 'user') {
      rendered = rendered.replace(
        mention.display,
        `<span class="text-blue-600">@${mention.reference}</span>`
      );
    }
  });

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
}
```

### Edit Mode Component

```typescript
// src/components/shared/CanonicalDescriptionField/DescriptionEditMode.tsx

import React from 'react';
import { TextArea } from '@atlaskit/textarea';
import { ErrorMessage } from '@atlaskit/form';
import type { DescriptionMention } from './description.types';

interface DescriptionEditModeProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  charCount: number;
  isNearLimit: boolean;
  error?: string;
  isLoading: boolean;
  mentions: DescriptionMention[];
}

export function DescriptionEditMode({
  value,
  onChange,
  placeholder,
  maxLength,
  charCount,
  isNearLimit,
  error,
  isLoading,
  mentions,
}: DescriptionEditModeProps) {
  return (
    <div className="space-y-2">
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={isLoading}
        isInvalid={!!error}
        className={`min-h-[120px] ${isNearLimit ? 'ring-2 ring-yellow-300' : ''}`}
        aria-label="Description"
      />
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {/* Markdown Hint */}
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        Supports: <code>**bold**</code> <code>_italic_</code> <code>`code`</code>
        {mentions.length > 0 && ` • Detected: ${mentions.length} mention(s)`}
      </div>
    </div>
  );
}
```

---

## 3. HOOKS LAYER

### useCanonicalDescription Hook

```typescript
// src/hooks/useCanonicalDescription.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { descriptionApi } from '@/lib/descriptionApi';
import type { WorkItemType } from '@/components/shared/CanonicalDescriptionField/description.types';

interface UseCanonicalDescriptionOptions {
  onSuccess?: (description: string) => void;
  onError?: (error: Error) => void;
}

export function useCanonicalDescription(
  workItemId: string,
  workItemType: WorkItemType,
  options?: UseCanonicalDescriptionOptions
) {
  const queryClient = useQueryClient();
  const queryKey = ['description', workItemId, workItemType];

  // Fetch description
  const {
    data: description = '',
    isLoading: isLoadingDescription,
    error: fetchError,
  } = useQuery({
    queryKey,
    queryFn: () => descriptionApi.fetch(workItemId, workItemType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Save mutation
  const { mutate: save, isPending: isSaving, error: saveError } = useMutation({
    mutationFn: (value: string) =>
      descriptionApi.update(workItemId, workItemType, value),
    onSuccess: (_, value) => {
      queryClient.setQueryData(queryKey, value);
      options?.onSuccess?.(value);
    },
    onError: (error) => {
      options?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
  });

  return {
    description,
    isLoading: isLoadingDescription,
    isSaving,
    error: fetchError || saveError,
    save,
  };
}
```

### useDescriptionValidation Hook

```typescript
// src/hooks/useDescriptionValidation.ts

import { useState, useCallback } from 'react';

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  isRequired?: boolean;
  customValidator?: (value: string) => string | null;
}

export function useDescriptionValidation(rules: ValidationRules) {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((value: string): boolean => {
    if (rules.isRequired && !value.trim()) {
      setError('Description is required');
      return false;
    }

    if (rules.minLength && value.length < rules.minLength) {
      setError(`Minimum ${rules.minLength} characters required`);
      return false;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      setError(`Maximum ${rules.maxLength} characters allowed`);
      return false;
    }

    if (rules.customValidator) {
      const customError = rules.customValidator(value);
      if (customError) {
        setError(customError);
        return false;
      }
    }

    setError(null);
    return true;
  }, [rules]);

  return { error, validate };
}
```

---

## 4. API LAYER

```typescript
// src/lib/descriptionApi.ts

import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/shared/CanonicalDescriptionField/description.types';

export const descriptionApi = {
  async fetch(workItemId: string, workItemType: WorkItemType): Promise<string> {
    // Route to correct table based on workItemType
    const table = getTableName(workItemType);
    const { data, error } = await supabase
      .from(table)
      .select('description')
      .eq('id', workItemId)
      .single();

    if (error) throw error;
    return data?.description || '';
  },

  async update(
    workItemId: string,
    workItemType: WorkItemType,
    description: string
  ): Promise<void> {
    const table = getTableName(workItemType);
    const { error } = await supabase
      .from(table)
      .update({
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workItemId);

    if (error) throw error;
  },
};

function getTableName(workItemType: WorkItemType): string {
  const tableMap: Record<WorkItemType, string> = {
    task: 'planner_tasks',
    feature: 'features',
    incident: 'incidents',
    epic: 'epics',
    story: 'stories',
  };

  return tableMap[workItemType];
}
```

---

## 5. USAGE EXAMPLES

### Example 1: Feature Detail Page

```typescript
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';

function FeatureDetailView({ featureId }: { featureId: string }) {
  const { description, save, isSaving, error } = useCanonicalDescription(
    featureId,
    'feature'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description);

  return (
    <CanonicalDescriptionField
      workItemId={featureId}
      workItemType="feature"
      value={value}
      onChange={setValue}
      onSave={save}
      isEditing={isEditing}
      onEditToggle={setIsEditing}
      isLoading={isSaving}
      error={error?.message}
      maxLength={5000}
      isRequired={true}
    />
  );
}
```

### Example 2: Task Modal

```typescript
function TaskModal({ task }: { task: Task }) {
  const { description, save } = useCanonicalDescription(task.id, 'task');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <CanonicalDescriptionField
      workItemId={task.id}
      workItemType="task"
      value={description}
      onChange={(v) => {}}
      onSave={save}
      isEditing={isEditing}
      onEditToggle={setIsEditing}
      placeholder="What is this task about?"
    />
  );
}
```

---

## 6. MIGRATION CHECKLIST

### Pre-Migration
- [ ] All ADS dependencies installed and available
- [ ] TypeScript types exported and tested
- [ ] useCanonicalDescription hook tested with all workItemTypes
- [ ] Dark mode verified (NOCTURNE tokens)
- [ ] Accessibility audit passed (WCAG AA)

### Migration Phase 1 (Backlog + Incidents)
- [ ] Replace DescriptionEditor.tsx → CanonicalDescriptionField
- [ ] Replace IncidentDescription.tsx → CanonicalDescriptionField
- [ ] Update all imports
- [ ] Test data persistence
- [ ] Verify no regressions

### Migration Phase 2 (Feature)
- [ ] Replace FeatureDescription.tsx → CanonicalDescriptionField
- [ ] Test mutation behavior
- [ ] Verify query invalidation

### Migration Phase 3 (Planner)
- [ ] Replace TaskDescription.tsx → CanonicalDescriptionField
- [ ] Replace DescriptionTab.tsx → CanonicalDescriptionField
- [ ] Test @mention functionality
- [ ] Test modal state management

### Post-Migration
- [ ] Remove deprecated components
- [ ] Remove shadcn/ui Textarea from description imports
- [ ] Update Storybook stories
- [ ] Document in project README

---

## 7. TESTING STRATEGY

### Unit Tests
- Description parsing (mentions, URLs)
- Validation logic
- Character counting

### Integration Tests
- useCanonicalDescription with all work item types
- Save/cancel workflows
- Edit/view mode toggling

### Visual Regression Tests
- Light mode appearance
- Dark mode (NOCTURNE) appearance
- Responsive behavior (mobile, tablet, desktop)

### Accessibility Tests
- Label associations
- Error message announcements
- Keyboard navigation (Tab, Enter, Escape)

---

## 8. ROLLOUT PLAN

| Phase | Week | Hub | Status |
|---|---|---|---|
| Foundation | W1 | — | Create CanonicalDescriptionField |
| Test Phase 1 | W2 | Backlog | Migration + verification |
| Phase 2 | W3 | Incidents | Migration + verification |
| Phase 3 | W4 | Feature | Migration + verification |
| Phase 4 | W5 | Planner | Migration + verification |
| Cleanup | W6 | All | Remove deprecated code |
| Launch | W7 | All | Announce + document |
