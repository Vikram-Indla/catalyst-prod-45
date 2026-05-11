/**
 * CatalystTitleEditor — Title inline edit (F2.3)
 */
import React, { memo, useState } from 'react';

export const CatalystTitleEditor = memo(function CatalystTitleEditor({ title, onSave }: { title: string; onSave: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  const handleSave = () => {
    onSave(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setValue(title);
      setEditing(false);
    }
  };

  return editing ? (
    <input
      autoFocus
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
    />
  ) : (
    <h1 onClick={() => setEditing(true)}>{title}</h1>
  );
});
