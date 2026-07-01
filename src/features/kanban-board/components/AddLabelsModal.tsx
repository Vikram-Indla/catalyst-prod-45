/**
 * AddLabelsModal — Jira-parity multi-select label editor.
 *
 *  Title mirrors Jira exactly: "Add labels to <issue key>".
 *  Body: helper text + <CreatableSelect isMulti> populated from a
 *  mode-scoped suggestion list (project / product / incident / tasks /
 *  release / test — via useLabelSuggestions). User can pick existing
 *  labels or create new ones by typing. Done writes the whole labels
 *  array to the mode's table via setLabels().
 *
 *  Width matches SprintCreateModal (867px) — same modal footprint the
 *  Add Flag dialog now uses.
 */
import React, { useMemo, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import CreatableSelect from '@atlaskit/select/CreatableSelect';
import { components, type MultiValueRemoveProps } from '@atlaskit/select';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { token } from '@atlaskit/tokens';
import { useLabelSuggestions } from '../data/useLabelSuggestions';
import type { KanbanMode } from '../data/useKanbanData';

interface Option { label: string; value: string; }

interface Props {
  issueId: string;
  issueKey: string;
  currentLabels: string[];
  mode: KanbanMode;
  projectKey?: string | null;
  productId?: string | null;
  onSave: (labels: string[]) => Promise<void> | void;
  onClose: () => void;
}

export const AddLabelsModal: React.FC<Props> = ({
  issueId, issueKey, currentLabels, mode, projectKey, productId, onSave, onClose,
}) => {
  const { data: suggestions = [] } = useLabelSuggestions({ mode, key: projectKey, productId });

  const [selected, setSelected] = useState<Option[]>(
    (currentLabels ?? []).map((l) => ({ label: l, value: l })),
  );
  const [saving, setSaving] = useState(false);

  const options: Option[] = useMemo(() => {
    const merged = new Set<string>(suggestions);
    for (const s of selected) merged.add(s.value);
    return Array.from(merged).map((v) => ({ label: v, value: v }));
  }, [suggestions, selected]);

  const handleDone = async () => {
    setSaving(true);
    try {
      await onSave(selected.map((s) => s.value));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  void issueId; // kept in prop list for symmetry with AddFlagModal call sites

  return (
    <ModalDialog onClose={onClose} width={867}>
      <ModalHeader hasCloseButton>
        <ModalTitle>Add labels to {issueKey}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{
          fontSize: 'var(--ds-font-size-300)', fontWeight: 600,
          color: token('color.text', 'var(--ds-text)'), marginBottom: 8,
        }}>
          Begin typing to find and create labels
        </div>
        <CreatableSelect<Option, true>
          inputId={`add-labels-${issueKey}`}
          isMulti
          isClearable
          placeholder="Labels"
          value={selected}
          options={options}
          onChange={(next) => setSelected((next ?? []) as Option[])}
          formatCreateLabel={(input) => `Create "${input}"`}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
          components={{
            // Swap the default react-select "close" glyph (bold cross with red
            // hover fill) for the canonical Atlaskit CrossIcon — matches the
            // thin Jira label-chip X.
            MultiValueRemove: (mvrProps: MultiValueRemoveProps<Option, true>) => (
              <components.MultiValueRemove {...mvrProps}>
                <CrossIcon
                  label=""
                  size="small"
                  primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')}
                />
              </components.MultiValueRemove>
            ),
          }}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            // Chip appearance: white background + subtle border, no default
            // neutral grey. ADS tokens only.
            multiValue: (base) => ({
              ...base,
              background: token('elevation.surface', 'var(--ds-surface)'),
              border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
              borderRadius: 3,
            }),
            multiValueLabel: (base) => ({
              ...base,
              color: token('color.text', 'var(--ds-text)'),
              background: 'transparent',
            }),
            multiValueRemove: (base) => ({
              ...base,
              padding: '0 2px',
              background: 'transparent',
              ':hover':  { background: 'transparent' },
              ':active': { background: 'transparent' },
              ':focus':  { background: 'transparent' },
            }),
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button
          appearance="primary"
          isDisabled={saving}
          onClick={handleDone}
        >
          {saving ? 'Saving…' : 'Done'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
};
