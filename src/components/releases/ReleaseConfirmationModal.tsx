/**
 * ReleaseConfirmationModal — confirm releasing a release.
 *
 * Jira parity:
 *   - Title: orange warning icon + "Release {release.name}"
 *   - "This release contains N unresolved work items."
 *   - Radio: Move unresolved work items to <dropdown>  OR  Ignore unresolved work items
 *   - Release date picker (defaults to release.release_date or today)
 *   - Footer: Release (yellow, enabled once choice + date valid) + Cancel
 *   - No "Create release notes" checkbox (out of scope).
 *
 * Phase 1 backend:
 *   - Update source.status='released', actual_date=releaseDate, release_date=releaseDate
 *   - TODO: re-point unresolved ph_issues.sprint_release entries when actionType='move'
 */
import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release } from '@/types/phase3-releases';
import { catalystFlag } from '@/lib/catalystFlag';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ProductSelect, type ProductOption } from './ReleaseFilters';

interface Props {
  isOpen: boolean;
  release: Release;
  projectKey: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

type Action = 'move' | 'ignore' | null;

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 12,
  color: 'var(--ds-text, #172B4D)',
  marginBottom: 6,
};

const radioRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  fontSize: 14,
  color: 'var(--ds-text, #292A2E)',
  userSelect: 'none',
};

const todayIso = () => new Date().toISOString().split('T')[0];

export function ReleaseConfirmationModal({ isOpen, release, onClose, onSuccess }: Props) {
  const [action, setAction] = useState<Action>('move');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<string>(release.release_date || todayIso());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    setAction('move');
    setTargetId(null);
    setReleaseDate(release.release_date || todayIso());
  }, [isOpen, release.id, release.release_date]);

  // Unresolved work-item count: ph_issues whose sprint_release.name matches this release
  // AND whose status_category is not 'done'.
  const { data: unresolvedCount = 0 } = useQuery({
    queryKey: ['unresolved-items', release.id, release.name],
    queryFn: async () => {
      const releaseName = release.name;
      if (!releaseName) return 0;
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, status_category, sprint_release')
        .not('sprint_release', 'is', null);
      if (error) throw new Error(error.message);
      let n = 0;
      for (const row of data ?? []) {
        const arr = (row as any).sprint_release;
        if (!Array.isArray(arr)) continue;
        const matches = arr.some((el: any) => el && el.name === releaseName);
        if (!matches) continue;
        const sc = String((row as any).status_category ?? '').toLowerCase();
        if (sc !== 'done') n++;
      }
      return n;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  // Other non-archived, non-released targets in the same project — for "Move to" picker
  const { data: candidates } = useQuery({
    queryKey: ['ph-releases-for-release-confirm', release.project_id, release.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases')
        .select('id, name, title, status, project_id')
        .eq('project_id', release.project_id)
        .neq('id', release.id)
        .neq('status', 'archived')
        .neq('status', 'released')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; name: string | null; title: string | null; status: string }>;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  const options: ProductOption[] = useMemo(
    () => (candidates ?? []).map((c) => ({ id: c.id, name: c.name || c.title || c.id })),
    [candidates],
  );

  const hasUnresolved = unresolvedCount > 0;

  const canSubmit =
    !!releaseDate &&
    (!hasUnresolved || action === 'ignore' || (action === 'move' && !!targetId));

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ph_releases')
        .update({
          status: 'released',
          actual_date: releaseDate,
          release_date: releaseDate,
          target_date: releaseDate,
        })
        .eq('id', release.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      onSuccess?.(release);
      onClose();
    },
    onError: (err: any) => {
      catalystFlag.error(err?.message || 'Failed to release');
    },
  });

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ds-icon-warning, #E2B203)', display: 'inline-flex' }}>
                  <WarningIcon label="" primaryColor="var(--ds-icon-warning, #E2B203)" size="medium" />
                </span>
                <span>Release {release.name}</span>
              </span>
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text, #292A2E)' }}>
                This release contains{' '}
                <span style={{ color: 'var(--ds-link, #0052CC)', fontWeight: 500 }}>
                  {unresolvedCount} unresolved work item{unresolvedCount === 1 ? '' : 's'}
                </span>
                .
              </p>

              {hasUnresolved && (
                <div>
                  <div style={labelStyle}>
                    Unresolved work items
                    <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 2 }}>*</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={radioRow}>
                      <input
                        style={{ accentColor: 'var(--ds-border-selected, #1868DB)' }}
                        type="radio"
                        name="release-action"
                        checked={action === 'move'}
                        onChange={() => setAction('move')}
                      />
                      <span>Move unresolved work items to</span>
                    </label>
                    <div style={{ marginLeft: 24 }}>
                      <ProductSelect
                        options={options}
                        value={targetId}
                        onChange={setTargetId}
                        placeholder="Select version"
                        searchPlaceholder="Search releases"
                        disabled={action !== 'move'}
                      />
                    </div>
                    <label style={radioRow}>
                      <input
                        style={{ accentColor: 'var(--ds-border-selected, #1868DB)' }}
                        type="radio"
                        name="release-action"
                        checked={action === 'ignore'}
                        onChange={() => { setAction('ignore'); setTargetId(null); }}
                      />
                      <span>Ignore unresolved work items</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <div style={labelStyle}>Release date</div>
                <CatalystDatePicker
                  value={releaseDate ? new Date(releaseDate) : null}
                  onChange={(date) =>
                    setReleaseDate(date ? date.toISOString().split('T')[0] : '')
                  }
                  placeholder="Release date"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="warning"
              isDisabled={!canSubmit || mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Release
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
