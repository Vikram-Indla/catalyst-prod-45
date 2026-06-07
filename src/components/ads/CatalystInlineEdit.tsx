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
    <InlineEdit
      defaultValue={defaultValue}
      label={label}
      editView={({ errorMessage, ...fieldProps }) => (
        <Textfield {...fieldProps} autoFocus placeholder={placeholder} isRequired={isRequired} />
      )}
      readView={() => (
        <div
          style={{
            fontSize: 14,
            lineHeight: '20px',
            padding: '8px 6px',
            color: defaultValue ? token('color.text', '#172B4D') : token('color.text.subtlest', '#6B778C'),
            wordBreak: 'break-word',
          }}
        >
          {defaultValue || placeholder || 'Click to edit'}
        </div>
      )}
      onConfirm={onConfirm}
    />
  );
}
