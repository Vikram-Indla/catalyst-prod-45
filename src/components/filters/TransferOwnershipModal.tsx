/**
 * TransferOwnershipModal (O8) — lets a filter owner hand the filter to another user.
 *
 * Uses @atlaskit/modal-dialog (rendered at page level, outside dynamic-table rows,
 * so the Atlaskit portal bug does not apply here).
 */
import React, { useState, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Avatar from '@atlaskit/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useChangeFilterOwner, type SavedFilterFull } from '@/hooks/workhub/useSavedFilters';
import { resolveAvatarUrl } from '@/lib/avatars';

interface ProfileOption {
  label: string;
  value: string;
  avatarUrl: string | null;
}

interface Props {
  filter: SavedFilterFull;
  onClose: () => void;
}

export function TransferOwnershipModal({ filter, onClose }: Props) {
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [selected, setSelected] = useState<ProfileOption | null>(null);
  const changeOwner = useChangeFilterOwner();

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        setProfileOptions(
          (data ?? [])
            .filter(p => p.full_name && p.id !== (filter.owner_id ?? filter.user_id))
            .map(p => ({ value: p.id, label: p.full_name!, avatarUrl: p.avatar_url ?? null }))
        );
      });
  }, [filter.owner_id, filter.user_id]);

  function handleTransfer() {
    if (!selected) return;
    changeOwner.mutate(
      { filterId: filter.id, newOwnerId: selected.value },
      { onSuccess: onClose }
    );
  }

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Transfer ownership</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: token('color.text.subtle') }}>
          Transfer <strong style={{ color: token('color.text') }}>{filter.name}</strong> to another member.
          The new owner will have full edit and delete rights.
        </p>
        <Select
          options={profileOptions}
          value={selected}
          onChange={opt => setSelected(opt as ProfileOption)}
          placeholder="Select new owner…"
          menuPosition="fixed"
          formatOptionLabel={(opt: ProfileOption) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" src={resolveAvatarUrl(opt.avatarUrl)} name={opt.label} />
              <span>{opt.label}</span>
            </div>
          )}
        />
      </ModalBody>

      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={changeOwner.isPending}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleTransfer}
          isDisabled={!selected}
          isLoading={changeOwner.isPending}
        >
          Transfer
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
