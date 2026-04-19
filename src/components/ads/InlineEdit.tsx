// @ts-nocheck
/**
 * InlineEdit — Catalyst wrapper over @atlaskit/inline-edit.
 *
 * The "click to reveal edit control, blur to commit" pattern used by every
 * right-rail field on a Jira issue view. Generic over the value type so
 * callers can use it with strings, dates, option objects, etc.
 *
 * Usage shape
 *
 *   <InlineEdit
 *     value={assignee}
 *     defaultValue={null}
 *     readView={() => <AssigneeView value={assignee} />}
 *     editView={(fieldProps) => <AssigneeEditor {...fieldProps} />}
 *     onConfirm={(next) => updateAssignee.mutate(next)}
 *     label="Assignee"
 *   />
 */
import AkInlineEdit from '@atlaskit/inline-edit';
import { type ReactNode } from 'react';

export interface InlineEditFieldProps<V> {
  /** Current value under edit. */
  value: V;
  /** Update value — call from your input's onChange. */
  onChange: (next: V) => void;
  /** Blur-to-confirm handler. Wire to your input's onBlur. */
  onBlur: () => void;
  /** Accessibility label — forwarded. */
  'aria-label'?: string;
}

export interface InlineEditProps<V> {
  /** Current value. */
  value: V;
  /** Fallback default when `value` is nullish. */
  defaultValue: V;
  /** Rendered when not editing. */
  readView: () => ReactNode;
  /** Rendered when editing. Receives props to spread onto your input. */
  editView: (fieldProps: InlineEditFieldProps<V>) => ReactNode;
  /** Blur handler — Atlaskit calls this with the committed value. */
  onConfirm: (next: V) => void;
  /** Optional validate function — non-empty error message blocks confirm. */
  validate?: (next: V) => string | undefined;
  /** Accessible label. REQUIRED. */
  label: string;
  /** Disables edit mode (shows readView only). */
  isDisabled?: boolean;
  /** Hides the separate edit icon — click anywhere on readView to enter edit. */
  hideActionButtons?: boolean;
  /** Prevents Atlaskit's Cancel/Confirm buttons — fully blur-driven. */
  keepEditViewOpenOnBlur?: boolean;
  testId?: string;
}

export function InlineEdit<V>({
  value,
  defaultValue,
  readView,
  editView,
  onConfirm,
  validate,
  label,
  isDisabled,
  hideActionButtons,
  keepEditViewOpenOnBlur,
  testId,
}: InlineEditProps<V>) {
  return (
    <AkInlineEdit<V>
      defaultValue={(value ?? defaultValue) as V}
      readView={readView}
      editView={(fieldProps) =>
        editView({
          value: fieldProps.value as V,
          onChange: fieldProps.onChange as (next: V) => void,
          onBlur: () => fieldProps.onBlur?.(),
          'aria-label': label,
        })
      }
      onConfirm={(next) => onConfirm(next)}
      validate={validate}
      label={label}
      isEditing={isDisabled ? false : undefined}
      isEditViewFullWidth
      hideActionButtons={hideActionButtons}
      keepEditViewOpenOnBlur={keepEditViewOpenOnBlur}
      testId={testId}
    />
  );
}