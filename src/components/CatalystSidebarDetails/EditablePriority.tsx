/**
 * EditablePriority — Priority field (F3.4)
 */
import React, { memo, useState } from 'react';

export const EditablePriority = memo(function EditablePriority({
  priority,
  onPriorityChange,
}: {
  priority: string;
  onPriorityChange: (priority: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const priorities = ['Lowest', 'Low', 'Medium', 'High', 'Highest'];

  return (
    <div>
      <label>Priority</label>
      <button data-testid="priority-button" onClick={() => setOpen(!open)}>
        {priority}
      </button>
      {open && (
        <select
          role="listbox"
          onChange={(e) => {
            onPriorityChange(e.target.value);
            setOpen(false);
          }}
        >
          {priorities.map((p) => (
            <option key={p} role="option">{p}</option>
          ))}
        </select>
      )}
      <div data-testid="priority-bar" style={{ height: '2px', background: '#999' }} />
    </div>
  );
});
