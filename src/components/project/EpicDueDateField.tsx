/**
 * @deprecated Use CatalystDueDateField from '@/components/shared/CatalystDueDateField'.
 * This shim keeps old callers compiling during migration.
 */
import React from 'react';
import { CatalystDueDateField } from '@/components/shared/CatalystDueDateField';

interface Props {
  issueId: string;
  dueDate: string | null;
  isEpic: boolean;
  onSave: (date: string | null) => Promise<void>;
}

export function EpicDueDateField({ dueDate, onSave }: Props) {
  return <CatalystDueDateField value={dueDate} onSave={onSave} />;
}

export default EpicDueDateField;
