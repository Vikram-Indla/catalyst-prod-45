// ============================================================================
// src/spaces/components/steps/StepFeatures.tsx
// Step 3 of 4 — optional feature toggles. Atlaskit-only.
// ============================================================================

import { Checkbox } from '@atlaskit/checkbox';
import { Field } from '@atlaskit/form';
import { Stack, Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import type { CreateSpaceDraft, SpaceFeatureFlags } from '../../types';

interface Props {
  draft: CreateSpaceDraft;
  onChange: (patch: Partial<CreateSpaceDraft>) => void;
}

interface FeatureRow {
  key: keyof SpaceFeatureFlags;
  label: string;
  description: string;
}

const FEATURES: FeatureRow[] = [
  {
    key: 'enableComments',
    label: 'Comments',
    description: 'Let collaborators discuss work items inline.',
  },
  {
    key: 'enableAttachments',
    label: 'Attachments',
    description: 'Allow files and images on issues and pages.',
  },
  {
    key: 'enableLikes',
    label: 'Reactions',
    description: 'Quick feedback with emoji reactions.',
  },
];

export function StepFeatures({ draft, onChange }: Props) {
  const setFeature = (key: keyof SpaceFeatureFlags, value: boolean) => {
    onChange({ features: { ...draft.features, [key]: value } });
  };

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
          Toggle the optional features for this project. You can change these
          at any time from project settings.
        </p>
      </Box>

      {FEATURES.map((feature) => (
        <Field key={feature.key} name={`feature-${feature.key}`} label="">
          {() => (
            <Box paddingBlock="space.050">
              <Checkbox
                name={`feature-${feature.key}`}
                isChecked={draft.features[feature.key]}
                onChange={(e) =>
                  setFeature(feature.key, (e.target as HTMLInputElement).checked)
                }
                label={
                  <span>
                    <span style={{ fontWeight: 600 }}>{feature.label}</span>
                    <span
                      style={{
                        display: 'block',
                        color: token('color.text.subtle'),
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {feature.description}
                    </span>
                  </span>
                }
              />
            </Box>
          )}
        </Field>
      ))}
    </Stack>
  );
}
