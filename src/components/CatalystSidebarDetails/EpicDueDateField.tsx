/**
 * EpicDueDateField — Due date field (F3.6)
 */
import React, { memo, useState } from 'react';

export const EpicDueDateField = memo(function EpicDueDateField({
  dueDate,
  onDueDateChange,
}: {
  dueDate: string | null;
  onDueDateChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <label>Due Date</label>
      <button data-testid="date-button" onClick={() => setOpen(!open)}>
        {dueDate ? formatDate(dueDate) : 'No due date'}
      </button>
      {open && (
        <div data-testid="calendar-picker">
          {[...Array(31)].map((_, i) => (
            <button key={i + 1} onClick={() => { onDueDateChange(`2026-05-${String(i + 1).padStart(2, '0')}`); setOpen(false); }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
