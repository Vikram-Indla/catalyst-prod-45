/**
 * EditDatesModal — start/due date editor used by sidebar row menu AND
 * empty-row + button. Hub-agnostic: callbacks own persistence.
 */
import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ModalDateField } from './primitives';
import type { TimelineIssue } from './types';

export function EditDatesModal({
  issue, onClose, onSave,
}: {
  issue: TimelineIssue;
  onClose: () => void;
  onSave: (startDate: string | null, dueDate: string | null) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState(issue.startDate ?? '');
  const [dueDate, setDueDate] = useState(issue.dueDate ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(startDate || null, dueDate || null);
    } catch (err) {
      console.warn('save dates failed:', err);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="small">
        <ModalHeader>
          <ModalTitle>{issue.startDate || issue.dueDate ? 'Edit dates' : 'Add dates'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '6px 8px', background: 'var(--ds-background-neutral-subtle, #F7F8F9)', borderRadius: 3 }}>
            <JiraIssueTypeIcon type={issue.issueType} size={14} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)' }}>{issue.issueKey}</span>
            <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #44546F)', fontFamily: 'var(--ds-font-family-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.summary}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4, fontFamily: 'var(--ds-font-family-body)' }}>Start date</label>
              <ModalDateField value={startDate} onChange={setStartDate} placeholder="Select start date" ariaLabel="Start date" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4, fontFamily: 'var(--ds-font-family-body)' }}>Due date</label>
              <ModalDateField value={dueDate} onChange={setDueDate} placeholder="Select due date" ariaLabel="Due date" />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose} isDisabled={saving}>Cancel</Button>
          <Button appearance="primary" onClick={handleSave} isDisabled={saving}>{saving ? 'Saving…' : 'Confirm'}</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}
