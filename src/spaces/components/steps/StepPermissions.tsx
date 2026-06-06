// ============================================================================
// src/spaces/components/steps/StepPermissions.tsx
// Step 2 of 4 — permission scheme + private toggle.
// Atlaskit-only.
// ============================================================================

import Select from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import { Field, HelperMessage, ErrorMessage } from '@atlaskit/form';
import { Stack, Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import type {
  CreateSpaceDraft,
  CreateSpaceFieldErrors,
  SpacePermissionScheme,
} from '../../types';
import { SPACE_PERMISSION_LABEL } from '../../types';
import { FIELD_NAME_TO_DOM } from '../../a11y/focusFirstError';

interface SchemeOption {
  label: string;
  value: SpacePermissionScheme;
}

const SCHEME_OPTIONS: SchemeOption[] = (
  ['DEFAULT', 'PRIVATE'] as SpacePermissionScheme[]
).map(value => ({ value, label: SPACE_PERMISSION_LABEL[value] }));

interface Props {
  draft: CreateSpaceDraft;
  errors: CreateSpaceFieldErrors;
  onChange: (patch: Partial<CreateSpaceDraft>) => void;
}

export function StepPermissions({ draft, errors, onChange }: Props) {
  const selectedScheme =
    SCHEME_OPTIONS.find(o => o.value === draft.permissionScheme) ?? SCHEME_OPTIONS[0];

  return (
    <Stack space="space.200">
      <Box>
        <p
          style={{
            margin: 0,
            color: token('color.text.subtle'),
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Choose who can access this project. You can change this later in
          project settings.
        </p>
      </Box>

      <Field<SchemeOption | null>
        name={FIELD_NAME_TO_DOM.permissionScheme}
        label="Permission scheme"
        isRequired
        defaultValue={selectedScheme}
      >
        {({ fieldProps }) => (
          <>
            <Select<SchemeOption>
              {...fieldProps}
              inputId={FIELD_NAME_TO_DOM.permissionScheme}
              options={SCHEME_OPTIONS}
              value={selectedScheme}
              onChange={(opt) => {
                if (opt) onChange({ permissionScheme: (opt as SchemeOption).value });
              }}
              isSearchable={false}
            />
            {errors.permissionScheme
              ? <ErrorMessage>{errors.permissionScheme}</ErrorMessage>
              : <HelperMessage>
                  Default = open to everyone in the workspace. Private = invite-only.
                </HelperMessage>}
          </>
        )}
      </Field>

      <Field
        name={FIELD_NAME_TO_DOM.isPrivate}
        label=""
      >
        {() => (
          <Checkbox
            name={FIELD_NAME_TO_DOM.isPrivate}
            isChecked={draft.isPrivate}
            onChange={(e) => onChange({ isPrivate: (e.target as HTMLInputElement).checked })}
            label="Hide this project from project lists for non-members"
          />
        )}
      </Field>
    </Stack>
  );
}
