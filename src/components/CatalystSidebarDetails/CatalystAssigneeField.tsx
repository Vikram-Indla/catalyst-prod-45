/**
 * CatalystAssigneeField — Assignee picker (F3.3)
 */
import React, { memo, useState } from 'react';

export const CatalystAssigneeField = memo(function CatalystAssigneeField({
  assignee,
  onAssigneeChange,
}: {
  assignee: any;
  onAssigneeChange: (assignee: any) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label>Assignee</label>
      <button data-testid="assignee-button" onClick={() => setOpen(!open)}>
        {assignee?.name || 'Unassigned'}
      </button>
      {open && (
        <div data-testid="assignee-picker-portal">
          <input placeholder="Search assignees..." />
          <div
            onClick={() => {
              onAssigneeChange({ name: 'John Doe' });
              setOpen(false);
            }}
          >
            John Doe
          </div>
          <div
            onClick={() => {
              onAssigneeChange({ name: 'Jane Smith' });
              setOpen(false);
            }}
          >
            Jane Smith
          </div>
        </div>
      )}
    </div>
  );
});
