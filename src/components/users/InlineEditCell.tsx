import { useState, useRef } from 'react';

interface InlineEditCellProps {
  value: string;
  field: string;
  userId: string;
  type: 'text' | 'select';
  options?: string[];
  onSave: (userId: string, field: string, value: string) => void;
}

export const InlineEditCell: React.FC<InlineEditCellProps> = ({
  value, field, userId, type, options = [], onSave
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(userId, field, editValue);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    return type === 'select' ? (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="ct-inline-select"
        autoFocus
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="ct-inline-input"
        autoFocus
      />
    );
  }

  return (
    <span
      className="ct-inline-editable"
      onDoubleClick={() => {
        setEditValue(value);
        setEditing(true);
      }}
      title="Double-click to edit"
    >
      {value || '—'}
    </span>
  );
};
