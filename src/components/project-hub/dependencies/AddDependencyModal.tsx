/**
 * Modal form to add a work item dependency
 *
 * Fields:
 *   1. Source issue (select)
 *   2. Dependency type (blocks / is blocked by)
 *   3. Target issue (select)
 *
 * Validation:
 *   - Source ≠ Target
 *   - Duplicate check (same source, target, type)
 *   - Both issues must exist in project
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Modal, { ModalBody, ModalHeader, ModalFooter, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { catalystToast } from '@/lib/catalystToast';

type IssueOption = {
  label: string;
  value: string;
};

type DependencyType = 'blocks' | 'is_blocked_by';

interface AddDependencyModalProps {
  projectKey: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDependencyModal({ projectKey, isOpen, onClose, onSuccess }: AddDependencyModalProps) {
  const [sourceKey, setSourceKey] = useState<IssueOption | null>(null);
  const [targetKey, setTargetKey] = useState<IssueOption | null>(null);
  const [depType, setDepType] = useState<DependencyType>('blocks');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project issues
  const { data: issues = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['project-issues', projectKey],
    queryFn: async () => {
      if (!projectKey) return [];

      const { data, error: supabaseError } = await supabase
        .from('ph_issues')
        .select('issue_key, summary')
        .eq('project_key', projectKey)
        .order('issue_key');

      if (supabaseError) {
        console.error('Error fetching issues:', supabaseError);
        return [];
      }

      return (data || []).map((issue: any) => ({
        label: `${issue.issue_key} — ${issue.summary || '(no summary)'}`,
        value: issue.issue_key,
      }));
    },
    enabled: isOpen && !!projectKey,
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
      // Insert dependency
      const { error: insertError } = await (supabase as any).from('ph_issue_dependencies').insert({
        project_key: projectKey,
        source_issue_key: sourceKey.value,
        target_issue_key: targetKey.value,
        dependency_type: depType,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setError('This dependency already exists');
        } else if (insertError.message.includes('constraint')) {
          setError('Invalid dependency (check that both issues exist)');
        } else {
          setError(insertError.message);
        }
        return;
      }

      onSuccess();
    } catch (err) {
      setError(String(err));
      catalystToast.error(`Failed to add dependency: ${String(err)}`);
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
                {/* Source issue */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    From (source)
                  </label>
                  <Select
                    options={issues}
                    value={sourceKey}
                    onChange={setSourceKey}
                    placeholder="Select source issue..."
                    isDisabled={isSubmitting}
                    isClearable
                  />
                </div>

                {/* Dependency type */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Relationship
                  </label>
                  <Select
                    options={depTypeOptions}
                    value={depTypeOptions.find((opt) => opt.value === depType)}
                    onChange={(opt) => opt && setDepType(opt.value)}
                    isDisabled={isSubmitting}
                  />
                </div>

                {/* Target issue */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    To (target)
                  </label>
                  <Select
                    options={issues}
                    value={targetKey}
                    onChange={setTargetKey}
                    placeholder="Select target issue..."
                    isDisabled={isSubmitting}
                    isClearable
                  />
                </div>

                {/* Error message */}
                {error && (
                  <div style={{ padding: 8, borderRadius: 4, background: 'var(--ds-background-danger, #FFECEB)', color: 'var(--ds-text-danger, #AE2A19)', fontSize: 12 }}>
                    {error}
                  </div>
                )}

                {/* Example dependency text */}
                {sourceKey && targetKey && sourceKey.value !== targetKey.value && (
                  <p style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)', margin: 0 }}>
                    {sourceKey.value} <strong>{depType}</strong> {targetKey.value}
                  </p>
                )}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button appearance="subtle" onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSubmit} isDisabled={!isFormValid || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add dependency'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
