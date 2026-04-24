// ============================================================================
// src/spaces/components/steps/StepBasics.tsx
// Step 1 of 4 — name, key, purpose, description.
// Atlaskit-only. Token-driven spacing.
// ============================================================================

import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { Field, HelperMessage, ErrorMessage } from '@atlaskit/form';
import { Box, Stack } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import type {
  CreateSpaceDraft,
  CreateSpaceFieldErrors,
  SpacePurpose,
} from '../../types';
import { SPACE_PURPOSE_LABEL } from '../../types';
import { CREATE_SPACE_LIMITS } from '../../validation/createSpace';
import {
  normaliseSpaceKeyInput,
  deriveSpaceKeyFromName,
  SPACE_KEY_LIMITS,
} from '../../validation/spaceKey';
import { FIELD_NAME_TO_DOM } from '../../a11y/focusFirstError';

interface PurposeOption {
  label: string;
  value: SpacePurpose;
}

const PURPOSE_OPTIONS: PurposeOption[] = (
  ['COLLABORATION', 'KNOWLEDGE_BASE', 'CUSTOM'] as SpacePurpose[]
).map(value => ({ value, label: SPACE_PURPOSE_LABEL[value] }));

interface Props {
  draft: CreateSpaceDraft;
  errors: CreateSpaceFieldErrors;
  /** Mark `key` as user-edited so we stop auto-deriving from name. */
  keyManuallyEdited: boolean;
  onChange: (patch: Partial<CreateSpaceDraft>) => void;
  onKeyManuallyEdited: () => void;
}

export function StepBasics({
  draft,
  errors,
  keyManuallyEdited,
  onChange,
  onKeyManuallyEdited,
}: Props) {
  const handleNameChange = (value: string) => {
    const next: Partial<CreateSpaceDraft> = { name: value };
    if (!keyManuallyEdited) {
      next.key = normaliseSpaceKeyInput(deriveSpaceKeyFromName(value));
    }
    onChange(next);
  };

  const selectedPurpose = PURPOSE_OPTIONS.find(o => o.value === draft.purpose) ?? PURPOSE_OPTIONS[0];

  return (
    <Stack space="space.200">
      {/* Project name */}
      <Field
        name={FIELD_NAME_TO_DOM.name}
        label="Project name"
        isRequired
      >
        {({ fieldProps }) => (
          <>
            <Textfield
              {...fieldProps}
              name={FIELD_NAME_TO_DOM.name}
              value={draft.name}
              maxLength={CREATE_SPACE_LIMITS.nameMax}
              placeholder="e.g. Digital Transformation Initiative"
              isInvalid={Boolean(errors.name)}
              onChange={(e) => handleNameChange((e.target as HTMLInputElement).value)}
            />
            {errors.name
              ? <ErrorMessage>{errors.name}</ErrorMessage>
              : <HelperMessage>Visible to your team. {CREATE_SPACE_LIMITS.nameMin}–{CREATE_SPACE_LIMITS.nameMax} characters.</HelperMessage>}
          </>
        )}
      </Field>

      {/* Project key */}
      <Field
        name={FIELD_NAME_TO_DOM.key}
        label="Project key"
        isRequired
      >
        {({ fieldProps }) => (
          <>
            <Textfield
              {...fieldProps}
              name={FIELD_NAME_TO_DOM.key}
              value={draft.key}
              maxLength={SPACE_KEY_LIMITS.maxLength}
              placeholder="e.g. DTI"
              isInvalid={Boolean(errors.key)}
              onChange={(e) => {
                onKeyManuallyEdited();
                onChange({ key: normaliseSpaceKeyInput((e.target as HTMLInputElement).value) });
              }}
              elemAfterInput={
                <Box paddingInlineEnd="space.100" xcss={undefined}>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      color: token('color.text.subtlest'),
                    }}
                  >
                    {draft.key.length}/{SPACE_KEY_LIMITS.maxLength}
                  </span>
                </Box>
              }
            />
            {errors.key
              ? <ErrorMessage>{errors.key}</ErrorMessage>
              : <HelperMessage>Letters and numbers only. Used as the issue prefix.</HelperMessage>}
          </>
        )}
      </Field>

      {/* Purpose */}
      <Field<PurposeOption | null>
        name={FIELD_NAME_TO_DOM.purpose}
        label="Purpose"
        isRequired
        defaultValue={selectedPurpose}
      >
        {({ fieldProps }) => (
          <>
            <Select<PurposeOption>
              {...fieldProps}
              inputId={FIELD_NAME_TO_DOM.purpose}
              options={PURPOSE_OPTIONS}
              value={selectedPurpose}
              onChange={(opt) => {
                if (opt) onChange({ purpose: (opt as PurposeOption).value });
              }}
              placeholder="Choose a purpose"
              isSearchable={false}
            />
            {errors.purpose
              ? <ErrorMessage>{errors.purpose}</ErrorMessage>
              : <HelperMessage>Drives the default feature toggles for this project.</HelperMessage>}
          </>
        )}
      </Field>

      {/* Description */}
      <Field
        name={FIELD_NAME_TO_DOM.description}
        label="Description"
      >
        {({ fieldProps }) => (
          <>
            <TextArea
              {...fieldProps}
              name={FIELD_NAME_TO_DOM.description}
              value={draft.description}
              minimumRows={3}
              maxLength={CREATE_SPACE_LIMITS.descriptionMax}
              placeholder="Optional. What is this project for?"
              isInvalid={Boolean(errors.description)}
              onChange={(e) => onChange({ description: (e.target as HTMLTextAreaElement).value })}
            />
            {errors.description
              ? <ErrorMessage>{errors.description}</ErrorMessage>
              : <HelperMessage>Up to {CREATE_SPACE_LIMITS.descriptionMax} characters.</HelperMessage>}
          </>
        )}
      </Field>
    </Stack>
  );
}
