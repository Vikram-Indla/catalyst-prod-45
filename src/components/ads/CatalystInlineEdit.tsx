/**
 * CatalystInlineEdit — ADS-canonical inline edit wrapper.
 * Click-to-edit pattern used in sidebar field rows + table cells.
 */
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';

interface CatalystInlineEditProps {
  defaultValue: string;
  label: string;
  onConfirm: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
}

export function CatalystInlineEdit({
  defaultValue,
  label,
  onConfirm,
  placeholder,
  isRequired = false,
}: CatalystInlineEditProps) {
  return (
    <div data-voice-zone="true" style={{ display: 'contents' }}>
    <InlineEdit
      defaultValue={defaultValue}
      label={label}
      editView={({ errorMessage, ...fieldProps }) => (
        <Textfield {...fieldProps} autoFocus placeholder={placeholder} isRequired={isRequired} />
      )}
      readView={() => (
        <div
          style={{
            fontSize: 'var(--ds-font-size-400)',
            lineHeight: '20px',
            padding: '8px 6px',
            color: defaultValue ? token('color.text', 'var(--ds-text)') : token('color.text.subtlest', 'var(--ds-text-subtlest)'),
            wordBreak: 'break-word',
          }}
        >
          {defaultValue || placeholder || 'Click to edit'}
        </div>
      )}
      onConfirm={onConfirm}
    />
    </div>
  );
}
