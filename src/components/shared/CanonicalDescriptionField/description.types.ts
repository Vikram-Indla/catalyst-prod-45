// Types for Canonical Description Field (ADS-compliant, Jira-parity)

export type WorkItemType = 'task' | 'feature' | 'incident' | 'epic' | 'story';

export interface DescriptionConfig {
  workItemId: string;
  workItemType: WorkItemType;
  maxLength: number;
  minLength?: number;
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
