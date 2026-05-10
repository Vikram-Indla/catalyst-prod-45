/**
 * EpicDueDateField — Generic due date editor using the Atlassian Design System
 * DatePicker (@atlaskit/datetime-picker).
 *
 * 2026-05-05: name preserved for backwards compatibility, but the field now
 * renders for any issue type whose Jira screen scheme contains `duedate` —
 * verified via getJiraIssueTypeMetaWithFields. The legacy `isEpic` guard was
 * removed; callers pass `isEpic={false}` for non-Epic types and the field
 * still renders. Only the storage column / layout context differs (Epic
 * groups Due date with Actual start / Actual end; non-Epic types render
 * Due date as a standalone row).
 *
 * Contract:
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

  // 2026-05-05: legacy `if (!isEpic) return null` guard removed. The component
  // now renders for any caller; isEpic is kept on the prop list for callers
  // that still pass it but no longer affects rendering.
  void isEpic;

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
    <div data-issue-id={issueId} className="cv-date-field" style={{ width: '100%', maxWidth: 200, opacity: saving ? 0.7 : 1 }}>
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
