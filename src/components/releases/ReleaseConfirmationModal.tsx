import React, { useState, useEffect, useMemo } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import TextField from '@atlaskit/textfield';
import { DatePicker as AkDatePicker } from '@atlaskit/datetime-picker';
import Checkbox from '@atlaskit/checkbox';
import Select from '@atlaskit/select';
import Flag from '@atlaskit/flag';
import { useUpdateRelease } from '@/hooks/releases/useUpdateRelease';
import { useReleases } from '@/hooks/releases/useReleases';
import { Release } from '@/types/phase3-releases';
import { supabase } from '@/integrations/supabase/client';

interface ReleaseConfirmationModalProps {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

// Unresolved = todo + in_progress work items for this release's Jira version,
// computed from vw_release_jira_progress (matched by jira_version_id).
const getUnresolvedCount = async (jiraVersionId?: string): Promise<number> => {
  if (!jiraVersionId) return 0;
  try {
    const { data, error } = await supabase
      .from('vw_release_jira_progress')
      .select('todo, in_progress')
      .eq('version_id', jiraVersionId)
      .maybeSingle();
    if (error || !data) return 0;
    return (data.todo ?? 0) + (data.in_progress ?? 0);
  } catch {
    return 0;
  }
};

export function ReleaseConfirmationModal({
  isOpen,
  release,
  projectKey,
  onClose,
  onSuccess,
}: ReleaseConfirmationModalProps) {
  const [actionType, setActionType] = useState<'move' | 'ignore' | null>(null);
  const [moveToReleaseId, setMoveToReleaseId] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState(
    release.release_date || new Date().toISOString().split('T')[0]
  );
  const [createReleaseNotes, setCreateReleaseNotes] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flagMessage, setFlagMessage] = useState<{ type: string; text: string } | null>(null);

  const { data: releasesData } = useReleases(projectKey);
  const updateMutation = useUpdateRelease(release.id);

  // Fetch unresolved issues count
  useEffect(() => {
    if (isOpen) {
      getUnresolvedCount((release as any).jira_version_id).then(setUnresolvedCount);
    }
  }, [isOpen, release]);

  // Filter to unreleased versions, exclude self
  const unreleaseVersionOptions = useMemo(() => {
    return (releasesData?.data || [])
      .filter((r) => r.status === 'unreleased' && r.id !== release.id)
      .map((r) => ({ label: r.name, value: r.id }));
  }, [releasesData, release.id]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Must select action only when there are unresolved items to handle
    if (unresolvedCount > 0 && !actionType) {
      newErrors.action = 'You must select how to handle unresolved items.';
    }

    // If move selected, must choose target
    if (actionType === 'move' && !moveToReleaseId) {
      newErrors.moveToRelease = 'You must select a target version for moving items.';
    }

    // Release date validation
    if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
      newErrors.releaseDate = 'The date you entered is not valid.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Catalyst-local release: mark released + record actual date.
      // (Work items link to Jira versions via ph_issues.sprint_release JSONB, which
      //  Catalyst does not reassign while wh-jira-sync is parked — so no move step.)
      const payload: any = {
        status: 'released',
        release_date: releaseDate,
        actual_date: releaseDate,
      };

      updateMutation.mutate(payload, {
        onSuccess: (result) => {
          setFlagMessage({
            type: 'success',
            text: `Release ${release.name} published`,
          });
          onSuccess?.(result);
          setTimeout(() => onClose(), 600);
        },
        onError: (error) => {
          setFlagMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to release version',
          });
        },
      });
    } catch (error) {
      setFlagMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const handleClose = () => {
    setActionType(null);
    setMoveToReleaseId(null);
    setReleaseDate(release.release_date || new Date().toISOString().split('T')[0]);
    setCreateReleaseNotes(false);
    setErrors({});
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} width={600}>
        <ModalHeader>
          <ModalTitle>Release {release.name}?</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <form onSubmit={handleSubmit}>
            {/* Section 1: Unresolved items gate */}
            {unresolvedCount > 0 && (
              <div
                style={{
                  marginBottom: '24px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--ds-background-warning-subtle, #FFF7D6)',
                  border: '1px solid var(--ds-border-warning, #FFAB00)',
                  borderRadius: '3px',
                }}
              >
                <p style={{ margin: '0 0 8px 0', color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                  This release contains {unresolvedCount} unresolved work item{unresolvedCount !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* Section 2: Action options */}
            {unresolvedCount > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <input
                      type="radio"
                      name="action"
                      value="move"
                      checked={actionType === 'move'}
                      onChange={(e) => setActionType(e.target.value as 'move')}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                      Move open items to next version
                    </span>
                  </label>
                  {actionType === 'move' && (
                    <div style={{ marginLeft: '24px', marginBottom: '12px' }}>
                      <Select
                        options={unreleaseVersionOptions}
                        value={
                          unreleaseVersionOptions.find((opt) => opt.value === moveToReleaseId) || null
                        }
                        onChange={(opt) => setMoveToReleaseId(opt?.value || null)}
                        placeholder="Select version..."
                        isClearable={false}
                      />
                      {errors.moveToRelease && (
                        <div
                          style={{
                            color: 'var(--ds-text-danger, #AE2A19)',
                            marginTop: '4px',
                          }}
                          role="alert"
                        >
                          {errors.moveToRelease}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="action"
                    value="ignore"
                    checked={actionType === 'ignore'}
                    onChange={(e) => setActionType(e.target.value as 'ignore')}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                    Ignore unresolved items
                  </span>
                </label>
              </div>
            )}

            {errors.action && (
              <div
                style={{
                  color: 'var(--ds-text-danger, #AE2A19)',
                  marginBottom: '16px',
                }}
                role="alert"
              >
                {errors.action}
              </div>
            )}

            {/* Section 3: Release date picker */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  color: 'var(--ds-text, #172B4D)',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Release date
              </label>
              <AkDatePicker
                value={releaseDate}
                onChange={(isoDate) => setReleaseDate(isoDate)}
                formatDisplayLabel="yyyy-MM-dd"
              />
              {errors.releaseDate && (
                <div
                  style={{
                    color: 'var(--ds-text-danger, #AE2A19)',
                    marginTop: '4px',
                  }}
                  role="alert"
                >
                  {errors.releaseDate}
                </div>
              )}
            </div>

            {/* Section 4: Release notes checkbox */}
            <div style={{ marginBottom: '24px' }}>
              <Checkbox
                isChecked={createReleaseNotes}
                onChange={(e) => setCreateReleaseNotes(e.currentTarget.checked)}
                label="Create release notes"
              />
            </div>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button appearance="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSubmit}
            isLoading={updateMutation.isPending}
          >
            Release
          </Button>
        </ModalFooter>
      </Modal>

      {flagMessage && (
        <Flag
          id={`flag-${Date.now()}`}
          icon={flagMessage.type === 'success' ? undefined : undefined}
          title={flagMessage.text}
          isDismissed={false}
          onDismissed={() => setFlagMessage(null)}
          appearance={flagMessage.type as any}
        />
      )}
    </>
  );
}
