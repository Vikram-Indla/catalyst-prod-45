/**
 * EpicDueDateField — Epic due date editor using the Atlassian Design System
 * DatePicker (@atlaskit/datetime-picker).
 *
 * Contract preserved for backwards compatibility with CatalystSidebarDetails:
 *   - props: { issueId, dueDate, isEpic, onSave(date | null) }
 *   - onSave receives an ISO 'YYYY-MM-DD' string, or null when cleared.
 *
 * Rules:
 *   - value passed to DatePicker must be 'YYYY-MM-DD' or '' (never null).
 *   - onChange returns '' when cleared → converted to null before saving.
 *   - weekStartDay={0} → Sunday first (Saudi calendar).
 */
import React, { useState, useEffect } from 'react';
import { DatePicker } from '@atlaskit/datetime-picker';

interface Props {
  issueId: string;
  dueDate: string | null;     // YYYY-MM-DD or null
  isEpic: boolean;
  onSave: (date: string | null) => Promise<void>;
}

export function EpicDueDateField({ issueId, dueDate, isEpic, onSave }: Props) {
  const [value, setValue] = useState<string>(dueDate ?? '');
  const [saving, setSaving] = useState(false);

  // Keep local value in sync when prop changes (e.g. after parent refetch)
  useEffect(() => {
    setValue(dueDate ?? '');
  }, [dueDate]);

  if (!isEpic) return null;

  const handleChange = async (newDate: string) => {
    // Atlaskit returns '' when cleared and 'YYYY-MM-DD' when set.
    const next = newDate || null;
    const prev = dueDate ?? null;
    if (next === prev) return;

    setValue(newDate);
    setSaving(true);
    try {
      await onSave(next);
    } catch {
      // Parent surfaces toast; revert local value.
      setValue(prev ?? '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-issue-id={issueId} style={{ width: '100%', maxWidth: 240, opacity: saving ? 0.7 : 1 }}>
      <DatePicker
        value={value}
        onChange={handleChange}
        shouldShowCalendarButton
        clearControlLabel="Clear due date"
        openCalendarLabel="Open due date calendar"
        weekStartDay={0}
        locale="en-GB"
        placeholder="DD/MM/YYYY"
      />
    </div>
  );
}

export default EpicDueDateField;
