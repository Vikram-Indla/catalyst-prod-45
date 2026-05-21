import React, { useState, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { RadioGroup } from '@atlaskit/radio';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { useCreateSavedFilter, useUpdateSavedFilter, type SavedFilterFull, type HubScope } from '@/hooks/workhub/useSavedFilters';

interface ProfileOption {
  label: string;
  value: string;
}

interface FilterSaveModalProps {
  /** Pass an existing filter to edit; omit to create a new one */
  filter?: SavedFilterFull;
  /** JQL to pre-populate on create */
  initialJql?: string;
  hubScope?: HubScope;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

const VIEWERS_OPTIONS = [
  { label: 'Private (only me)',      value: 'private'  },
  { label: 'Organisation',           value: 'org'      },
  { label: 'Specific people',        value: 'specific' },
];

const EDITORS_OPTIONS = [
  { label: 'Owner only',             value: 'owner_only' },
  { label: 'Specific people',        value: 'specific'   },
];

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{
      display: 'block',
      marginBottom: 4,
      fontSize: 12,
      fontWeight: token('font.weight.semibold'),
      color: token('color.text.subtle'),
    }}>
      {children}
      {required && <span style={{ color: token('color.text.danger'), marginLeft: 4 }}>*</span>}
    </label>
  );
}

export function FilterSaveModal({
  filter,
  initialJql,
  hubScope = 'project',
  onClose,
  onSaved,
}: FilterSaveModalProps) {
  const isEditing = !!filter;
  const createFilter = useCreateSavedFilter();
  const updateFilter = useUpdateSavedFilter();

  const [name, setName] = useState(filter?.name ?? '');
  const [description, setDescription] = useState(filter?.description ?? '');
  const [viewersType, setViewersType] = useState<string>(filter?.viewers_config?.type ?? 'private');
  const [editorsType, setEditorsType] = useState<string>(filter?.editors_config?.type ?? 'owner_only');
  const [viewerUsers, setViewerUsers] = useState<ProfileOption[]>([]);
  const [editorUsers, setEditorUsers] = useState<ProfileOption[]>([]);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);

  const saving = createFilter.isPending || updateFilter.isPending;

  // Load user options for people pickers
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        setProfileOptions(
          (data ?? [])
            .filter(p => p.full_name)
            .map(p => ({ value: p.id, label: p.full_name! }))
        );
      });
  }, []);

  // Seed people pickers when editing
  useEffect(() => {
    if (!filter) return;
    if (filter.viewers_config?.user_ids?.length) {
      setViewerUsers(
        profileOptions.filter(o => filter.viewers_config.user_ids!.includes(o.value))
      );
    }
    if (filter.editors_config?.user_ids?.length) {
      setEditorUsers(
        profileOptions.filter(o => filter.editors_config.user_ids!.includes(o.value))
      );
    }
  }, [filter, profileOptions]);

  function buildConfigs() {
    const viewersConfig = viewersType === 'specific'
      ? { type: 'specific' as const, user_ids: viewerUsers.map(u => u.value) }
      : { type: viewersType as 'private' | 'org' };
    const editorsConfig = editorsType === 'specific'
      ? { type: 'specific' as const, user_ids: editorUsers.map(u => u.value) }
      : { type: editorsType as 'owner_only' };
    return { viewersConfig, editorsConfig, isShared: viewersType !== 'private' };
  }

  function handleSave() {
    if (!name.trim()) return;   // Textfield is required — browser validation fires first

    const { viewersConfig, editorsConfig, isShared } = buildConfigs();

    if (isEditing && filter) {
      updateFilter.mutate(
        {
          id: filter.id,
          updates: {
            name: name.trim(),
            description: description.trim() || null,
            is_shared: isShared,
            viewers_config: viewersConfig,
            editors_config: editorsConfig,
          } as any,
        },
        { onSuccess: () => { onSaved?.(filter.id); onClose(); } }
      );
    } else {
      createFilter.mutate(
        {
          name: name.trim(),
          filter_config: { jql_query: initialJql ?? null },
          page: 'filters',
          is_shared: isShared,
          hub_scope: hubScope,
          viewers_config: viewersConfig,
          editors_config: editorsConfig,
          description: description.trim() || null,
        } as any,
        { onSuccess: (data: any) => { onSaved?.(data?.id); onClose(); } }
      );
    }
  }

  return (
    <ModalDialog onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>{isEditing ? 'Edit filter' : 'Save filter'}</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name */}
          <div>
            <FieldLabel required>Name</FieldLabel>
            <Textfield
              value={name}
              onChange={e => setName((e.target as HTMLInputElement).value)}
              placeholder="e.g. My open bugs"
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <TextArea
              value={description}
              onChange={e => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="What does this filter show?"
              minimumRows={2}
              maxHeight="80px"
            />
          </div>

          {/* Viewers */}
          <div>
            <FieldLabel>Who can view</FieldLabel>
            <RadioGroup
              options={VIEWERS_OPTIONS}
              value={viewersType}
              onChange={e => setViewersType(e.currentTarget.value)}
            />
            {viewersType === 'specific' && (
              <div style={{ marginTop: 8 }}>
                <Select
                  isMulti
                  options={profileOptions}
                  value={viewerUsers}
                  onChange={vals => setViewerUsers(vals as ProfileOption[])}
                  placeholder="Select people…"
                />
              </div>
            )}
          </div>

          {/* Editors */}
          <div>
            <FieldLabel>Who can edit</FieldLabel>
            <RadioGroup
              options={EDITORS_OPTIONS}
              value={editorsType}
              onChange={e => setEditorsType(e.currentTarget.value)}
            />
            {editorsType === 'specific' && (
              <div style={{ marginTop: 8 }}>
                <Select
                  isMulti
                  options={profileOptions}
                  value={editorUsers}
                  onChange={vals => setEditorUsers(vals as ProfileOption[])}
                  placeholder="Select people…"
                />
              </div>
            )}
          </div>

        </div>
      </ModalBody>

      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={saving}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={handleSave} isLoading={saving}>
          {isEditing ? 'Update' : 'Save filter'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
