import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import TextField from '@atlaskit/textfield';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getEntry, type DependencyIndex, type UiDirection } from '@/components/shared/Timeline/dependencies/normalize';
import { filterCandidateIssues, relatedKeysFor, type CandidateIssue } from './depSectionModel';

export interface AddDependencyDialogProps {
  isOpen: boolean;
  issueKey: string;
  projectKey: string;
  index: DependencyIndex;
  /** lowercased subtask-family type names to exclude from candidates */
  subtaskTypesLower: Set<string>;
  onClose: () => void;
  onSubmit: (direction: UiDirection, otherKey: string) => Promise<{ ok: boolean; error?: string }>;
}

const DIRECTION_OPTIONS: Array<{ label: string; value: UiDirection }> = [
  { label: 'blocks', value: 'blocks' },
  { label: 'is blocked by', value: 'is_blocked_by' },
];

export function AddDependencyDialog({
  isOpen, issueKey, projectKey, index, subtaskTypesLower, onClose, onSubmit,
}: AddDependencyDialogProps) {
  const [direction, setDirection] = useState<UiDirection>('blocks');
  const [target, setTarget] = useState<{ label: string; value: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const relatedKeys = useMemo(() => relatedKeysFor(getEntry(index, issueKey)), [index, issueKey]);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['dependency-candidates', projectKey, issueKey, Array.from(relatedKeys).sort().join(','), debouncedSearchTerm],
    queryFn: async () => {
      if (!projectKey) return [];
      const q = debouncedSearchTerm.trim();
      let query = supabase
        .from('ph_issues')
        .select('issue_key, issue_type, parent_key, summary')
        .eq('project_key', projectKey)
        .is('deleted_at', null);
      if (q) {
        query = query.or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`);
      }
      const { data, error: qErr } = await query.limit(25);
      if (qErr) throw new Error(qErr.message ?? 'Failed to load work items');
      const rows = (data ?? []) as (CandidateIssue & { summary?: string })[];
      const filtered = filterCandidateIssues(rows, { issueKey, relatedKeys, subtaskTypesLower });
      return filtered.map((r) => ({ value: r.issue_key, label: `${r.issue_key} — ${r.summary ?? ''}`.trim() }));
    },
    enabled: isOpen && !!projectKey,
  });

  const canSubmit = !!target && !submitting;

  const handleSubmit = async () => {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(direction, target.value);
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? 'Failed to add dependency'); return; }
    setTarget(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalTransition>
      <ModalDialog onClose={onClose}>
        <ModalHeader hasCloseButton>
          <ModalTitle>Add dependency</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
                {issueKey}
              </label>
              <Select
                inputId="dep-direction"
                options={DIRECTION_OPTIONS}
                value={DIRECTION_OPTIONS.find((o) => o.value === direction)}
                onChange={(o) => o && setDirection((o as { value: UiDirection }).value)}
                isDisabled={submitting}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
                Work item
              </label>
              <TextField
                aria-label="Search work items"
                placeholder="Search by key or summary…"
                value={searchTerm}
                onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                isDisabled={submitting}
              />
              <div style={{ marginTop: 8 }}>
                <Select
                  inputId="dep-target"
                  options={options}
                  value={target}
                  onChange={(o) => setTarget(o as { label: string; value: string } | null)}
                  isLoading={isLoading}
                  isClearable
                  placeholder="Select a work item…"
                  isDisabled={submitting}
                />
              </div>
            </div>
            {error && (
              <div role="alert" style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>
                {error}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose} isDisabled={submitting}>Cancel</Button>
          <Button appearance="primary" onClick={handleSubmit} isDisabled={!canSubmit}>Add</Button>
        </ModalFooter>
      </ModalDialog>
    </ModalTransition>
  );
}
