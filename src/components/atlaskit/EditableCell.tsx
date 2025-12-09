import { useState } from 'react';
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  isReadOnly?: boolean;
}

export function EditableCell({ value, onSave, placeholder = '-', isReadOnly = false }: EditableCellProps) {
  const [editValue, setEditValue] = useState(value);

  if (isReadOnly) {
    return (
      <div style={{
        padding: `${token('space.050', '4px')} ${token('space.100', '8px')}`,
        minHeight: '32px',
        display: 'flex',
        alignItems: 'center',
      }}>
        {value || placeholder}
      </div>
    );
  }

  return (
    <InlineEdit
      defaultValue={value}
      editView={({ errorMessage, ...fieldProps }) => (
        <Textfield 
          {...fieldProps} 
          autoFocus 
          value={editValue}
          onChange={(e) => setEditValue((e.target as HTMLInputElement).value)}
        />
      )}
      readView={() => (
        <div style={{
          padding: `${token('space.050', '4px')} ${token('space.100', '8px')}`,
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '3px',
          cursor: 'pointer',
        }}>
          {value || placeholder}
        </div>
      )}
      onConfirm={(value) => {
        const trimmedValue = String(value).trim();
        if (trimmedValue.length <= 500) {
          onSave(trimmedValue);
        }
      }}
    />
  );
}

export default EditableCell;
