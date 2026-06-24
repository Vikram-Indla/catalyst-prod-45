import React, { useState, useMemo } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import SectionMessage from '@atlaskit/section-message';
import { supabase } from '@/integrations/supabase/client';
import { Release } from '@/types/phase3-releases';
import { useUpdateRelease } from '@/hooks/releases/useUpdateRelease';
import { useReleases } from '@/hooks/releases/useReleases';
import { catalystToast } from '@/lib/catalystToast';

interface ReleaseMergeDialogProps {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

export function ReleaseMergeDialog({
  isOpen,
  release,
  projectKey,
  onClose,
  onSuccess,
}: ReleaseMergeDialogProps) {
  const { data: releasesResponse } = useReleases(projectKey);
  const updateRelease = useUpdateRelease();
  const [targetReleaseId, setTargetReleaseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out current release and archived releases
  const mergeTargets = useMemo(() => {
    const allReleases = releasesResponse?.data ?? [];
    return allReleases
      .filter((r) => r.id !== release.id && r.status !== 'archived')
      .map((r) => ({
        label: r.name,
        value: r.id,
      }));
  }, [releasesResponse, release.id]);

  const handleMerge = async () => {
    if (!targetReleaseId) {
      catalystToast.error('Please select a target release');
      return;
    }

    setIsSubmitting(true);
    try {
      // Move all work items from source release to target release
      const { error: moveError } = await supabase
        .from('ph_issues')
        .update({ sprint_release: targetReleaseId })
        .eq('sprint_release', release.jira_version_id);

      if (moveError) throw new Error(moveError.message);

      // Archive the source release
      await updateRelease.mutateAsync({
        id: release.id,
        updates: { status: 'archived' },
      });

      onSuccess?.(release);
      onClose();
      catalystToast.success(`Release "${release.name}" merged into target release`);
    } catch (err) {
      catalystToast.error(err instanceof Error ? err.message : 'Failed to merge releases');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} isOpen={isOpen}>
      <ModalHeader>
        <ModalTitle>Merge Release</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p>
          Merge <strong>{release.name}</strong> into another release. All work items will be moved to the target release, and this release will be archived.
        </p>

        {mergeTargets.length === 0 ? (
          <SectionMessage appearance="warning">
            <p>No available target releases. Create another release first.</p>
          </SectionMessage>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Target Release
            </label>
            <Select
              options={mergeTargets}
              value={mergeTargets.find((o) => o.value === targetReleaseId) || null}
              onChange={(opt: any) => setTargetReleaseId(opt?.value || null)}
              placeholder="Select release to merge into"
            />
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="danger"
          onClick={handleMerge}
          isDisabled={!targetReleaseId || isSubmitting || mergeTargets.length === 0}
          isLoading={isSubmitting}
        >
          Merge
        </Button>
      </ModalFooter>
    </Modal>
  );
}
