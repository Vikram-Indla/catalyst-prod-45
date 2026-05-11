/**
 * DescriptionEditor — Description editor (F2.6)
 */
import React, { memo, useState } from 'react';

export const DescriptionEditor = memo(function DescriptionEditor({ description, onSave }: { description: string; onSave: (desc: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description);

  return (
    <div>
      <h2>Description</h2>
      {editing ? (
        <div>
          <textarea data-testid="editor-input" value={value} onChange={(e) => setValue(e.target.value)} />
          <button onClick={() => { onSave(value); setEditing(false); }}>Save</button>
          <button onClick={() => { setValue(description); setEditing(false); }}>Cancel</button>
        </div>
      ) : (
        <div onClick={() => setEditing(true)}>{description}</div>
      )}
    </div>
  );
});
