/**
 * Canonical Add-dependency modal (project / product / incident).
 *
 * Data-source-agnostic: the candidate list and the create write are supplied by
 * the calling hub via `fetchCandidates` + `onCreate`. Storage is always
 * `ph_issue_dependencies`; only the candidate source differs (ph_issues vs
 * business_requests). (Vikram 2026-06-25)
 *
 * Fields: Source · Relationship (blocks / is blocked by) · Target.
 * Validation: Source ≠ Target; create errors surfaced inline.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Modal, { ModalBody, ModalHeader, ModalFooter, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { catalystToast } from '@/lib/catalystToast';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { DependencyType, DependencyCandidate } from './types';

type IssueOption = { label: string; value: string; issueType: string | null; projectKey?: string | null };

function renderIssueOption(opt: IssueOption) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {opt.issueType ? <JiraIssueTypeIcon type={opt.issueType} size={16} /> : null}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
    </span>
  );
}

// Portal the select menu to <body> so the autocomplete dropdown floats ABOVE
// the modal instead of being clipped inside ModalBody's scroll area (Jira parity).
const MENU_PORTAL_PROPS = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
  styles: { menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) },
} as const;

interface AddDependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Cache key scope (project key / product code / 'incidents'). */
  scopeKey: string;
  /** Hub-supplied candidate list (source/target options). */
  fetchCandidates: () => Promise<DependencyCandidate[]>;
  /** Hub-supplied write — inserts into ph_issue_dependencies. Throws on error. */
  onCreate: (source: DependencyCandidate, target: DependencyCandidate, type: DependencyType) => Promise<void>;
}

export default function AddDependencyModal({ isOpen, onClose, onSuccess, scopeKey, fetchCandidates, onCreate }: AddDependencyModalProps) {
  const [sourceKey, setSourceKey] = useState<IssueOption | null>(null);
  const [targetKey, setTargetKey] = useState<IssueOption | null>(null);
  const [depType, setDepType] = useState<DependencyType>('blocks');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: candidates = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['dep-candidates', scopeKey],
    queryFn: async () => {
      const list = await fetchCandidates();
      return list.map((c) => ({ label: c.label, value: c.value, issueType: c.issueType, projectKey: c.projectKey ?? null }));
    },
    enabled: isOpen,
  });

  const depTypeOptions: Array<{ label: string; value: DependencyType }> = [
    { label: 'blocks', value: 'blocks' },
    { label: 'is blocked by', value: 'is_blocked_by' },
  ];

  const isFormValid = sourceKey && targetKey && sourceKey.value !== targetKey.value;

  const handleSubmit = async () => {
    if (!isFormValid || !sourceKey || !targetKey) {
      setError('Please fill in all fields');
      return;
    }
    if (sourceKey.value === targetKey.value) {
      setError('Source and target must be different');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate(
        { value: sourceKey.value, label: sourceKey.label, issueType: sourceKey.issueType, projectKey: sourceKey.projectKey },
        { value: targetKey.value, label: targetKey.label, issueType: targetKey.issueType, projectKey: targetKey.projectKey },
        depType,
      );
      onSuccess();
    } catch (err) {
      const msg = (err as any)?.message ?? String(err);
      if (/duplicate/i.test(msg)) setError('This dependency already exists');
      else if (/constraint/i.test(msg)) setError('Invalid dependency (check that both items exist)');
      else setError(msg);
      catalystToast.error(`Failed to add dependency: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium" shouldCloseOnEscapePress>
          <ModalHeader>
            <ModalTitle>Add dependency</ModalTitle>
          </ModalHeader>

          <ModalBody>
            {issuesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <Spinner />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, marginBottom: 4 }}>From (source)</label>
                  <Select
                    options={candidates}
                    value={sourceKey}
                    onChange={setSourceKey}
                    placeholder="Select source item..."
                    isDisabled={isSubmitting}
                    isClearable
                    formatOptionLabel={renderIssueOption as any}
                    {...MENU_PORTAL_PROPS}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, marginBottom: 4 }}>Relationship</label>
                  <Select
                    options={depTypeOptions}
                    value={depTypeOptions.find((opt) => opt.value === depType)}
                    onChange={(opt) => opt && setDepType(opt.value)}
                    isDisabled={isSubmitting}
                    {...MENU_PORTAL_PROPS}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, marginBottom: 4 }}>To (target)</label>
                  <Select
                    options={candidates}
                    value={targetKey}
                    onChange={setTargetKey}
                    placeholder="Select target item..."
                    isDisabled={isSubmitting}
                    isClearable
                    formatOptionLabel={renderIssueOption as any}
                    {...MENU_PORTAL_PROPS}
                  />
                </div>

                {error && (
                  <div style={{ padding: 8, borderRadius: 4, background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)', fontSize: 'var(--ds-font-size-200)' }}>
                    {error}
                  </div>
                )}

                {sourceKey && targetKey && sourceKey.value !== targetKey.value && (
                  <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', margin: 0 }}>
                    {sourceKey.value} <strong>{depType}</strong> {targetKey.value}
                  </p>
                )}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button appearance="subtle" onClick={onClose} isDisabled={isSubmitting}>Cancel</Button>
            <Button appearance="primary" onClick={handleSubmit} isDisabled={!isFormValid || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add dependency'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
