// ============================================================================
// src/spaces/components/CreateSpaceWizard.tsx
// 4-step state machine: Basics → Permissions → Features → Review.
// Atlaskit-only. No shadcn / radix / bespoke Tailwind. Tokens for spacing.
// ============================================================================

import { useCallback, useMemo, useRef, useState } from 'react';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import Form, { FormFooter, FormHeader } from '@atlaskit/form';
import { Box, Inline, Stack } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import SectionMessage from '@atlaskit/section-message';

import {
  emptyCreateSpaceDraft,
  type CreateSpaceDraft,
  type CreateSpaceFieldErrors,
  type CreateSpaceRequest,
  type Space,
} from '../types';
import {
  validateCreateSpaceDraft,
  hasErrors,
  firstErrorField,
  FIELD_ORDER,
} from '../validation/createSpace';
import { focusFirstError } from '../a11y/focusFirstError';
import { isSpaceError, SpaceError } from '../errors';
import { useSpaceService } from '../services/SpaceServiceContext';

import { StepBasics } from './steps/StepBasics';
import { StepPermissions } from './steps/StepPermissions';
import { StepFeatures } from './steps/StepFeatures';
import { StepReview } from './steps/StepReview';

type StepId = 'basics' | 'permissions' | 'features' | 'review';

const STEPS: ReadonlyArray<{ id: StepId; label: string }> = [
  { id: 'basics', label: 'Basics' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'features', label: 'Features' },
  { id: 'review', label: 'Review' },
];

/** Fields that block advancing from each step. */
const STEP_FIELDS: Record<StepId, ReadonlyArray<keyof CreateSpaceDraft>> = {
  basics: ['name', 'key', 'purpose', 'description'],
  permissions: ['permissionScheme', 'isPrivate'],
  features: ['features'],
  review: [],
};

interface Props {
  onCancel: () => void;
  onCreated: (space: Space) => void;
}

export function CreateSpaceWizard({ onCancel, onCreated }: Props) {
  const service = useSpaceService();
  const containerRef = useRef<HTMLDivElement>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<CreateSpaceDraft>(() => emptyCreateSpaceDraft());
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<CreateSpaceFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const currentStep = STEPS[stepIdx];

  const onChange = useCallback((patch: Partial<CreateSpaceDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    // Clear field-level errors for keys included in the patch as the user types.
    setErrors(prev => {
      const next = { ...prev };
      for (const k of Object.keys(patch) as Array<keyof CreateSpaceDraft>) {
        if (next[k]) delete next[k];
      }
      return next;
    });
    if (serverError) setServerError(null);
  }, [serverError]);

  /** Validate ONLY the fields owned by the current step before Next. */
  const validateCurrentStep = useCallback((): CreateSpaceFieldErrors => {
    const all = validateCreateSpaceDraft(draft);
    const stepFields = STEP_FIELDS[currentStep.id];
    const scoped: CreateSpaceFieldErrors = {};
    for (const field of stepFields) {
      if (all[field]) scoped[field] = all[field];
    }
    return scoped;
  }, [draft, currentStep.id]);

  const goNext = useCallback(async () => {
    const stepErrors = validateCurrentStep();
    if (hasErrors(stepErrors)) {
      setErrors(prev => ({ ...prev, ...stepErrors }));
      const first = firstErrorField(stepErrors);
      focusFirstError(first, containerRef.current);
      return;
    }

    // On step 1 (basics), do an async key-uniqueness check before advancing.
    if (currentStep.id === 'basics') {
      try {
        setSubmitting(true);
        const unique = await service.isKeyUnique(draft.key);
        setSubmitting(false);
        if (!unique) {
          setErrors(prev => ({ ...prev, key: 'This key is already in use' }));
          focusFirstError('key', containerRef.current);
          return;
        }
      } catch (err) {
        setSubmitting(false);
        setServerError(
          isSpaceError(err)
            ? err.message
            : 'Could not verify project key. Please try again.',
        );
        return;
      }
    }

    setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
  }, [validateCurrentStep, currentStep.id, service, draft.key]);

  const goBack = useCallback(() => {
    setServerError(null);
    setStepIdx(i => Math.max(i - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    const allErrors = validateCreateSpaceDraft(draft);
    if (hasErrors(allErrors)) {
      setErrors(allErrors);
      setStepIdx(0);
      const first = firstErrorField(allErrors);
      focusFirstError(first, containerRef.current);
      return;
    }

    const request: CreateSpaceRequest = {
      name: draft.name.trim(),
      key: draft.key.trim().toUpperCase(),
      purpose: draft.purpose,
      description: draft.description.trim() || undefined,
      permissionScheme: draft.permissionScheme,
      isPrivate: draft.isPrivate,
      features: draft.features,
    };

    try {
      setSubmitting(true);
      setServerError(null);
      const created = await service.createSpace(request);
      setSubmitting(false);
      onCreated(created);
    } catch (err) {
      setSubmitting(false);
      if (isSpaceError(err)) {
        if (err.code === 'SPACE_KEY_NOT_UNIQUE') {
          setErrors(prev => ({ ...prev, key: 'This key is already in use' }));
          setStepIdx(0);
          focusFirstError('key', containerRef.current);
          return;
        }
        if (err.code === 'VALIDATION_ERROR' && err.details.fieldErrors) {
          // Map server-side field errors back into the wizard.
          const mapped: CreateSpaceFieldErrors = {};
          for (const [field, message] of Object.entries(err.details.fieldErrors)) {
            if ((FIELD_ORDER as ReadonlyArray<string>).includes(field)) {
              mapped[field as keyof CreateSpaceDraft] = message;
            }
          }
          if (Object.keys(mapped).length > 0) {
            setErrors(prev => ({ ...prev, ...mapped }));
            setStepIdx(0);
            focusFirstError(firstErrorField(mapped), containerRef.current);
          } else {
            setServerError(err.message);
          }
          return;
        }
        setServerError(err.message);
        return;
      }
      setServerError(err instanceof Error ? err.message : 'Failed to create project');
    }
  }, [draft, service, onCreated]);

  const stepBody = useMemo(() => {
    switch (currentStep.id) {
      case 'basics':
        return (
          <StepBasics
            draft={draft}
            errors={errors}
            keyManuallyEdited={keyManuallyEdited}
            onChange={onChange}
            onKeyManuallyEdited={() => setKeyManuallyEdited(true)}
          />
        );
      case 'permissions':
        return <StepPermissions draft={draft} errors={errors} onChange={onChange} />;
      case 'features':
        return <StepFeatures draft={draft} onChange={onChange} />;
      case 'review':
        return <StepReview draft={draft} />;
    }
  }, [currentStep.id, draft, errors, keyManuallyEdited, onChange]);

  const isFirstStep = stepIdx === 0;
  const isLastStep = stepIdx === STEPS.length - 1;

  return (
    <div ref={containerRef}>
      <Form onSubmit={() => undefined}>
        {() => (
          <>
            <FormHeader title={currentStep.label}>
              <Box paddingBlockStart="space.050">
                <span style={{ fontSize: 12, color: token('color.text.subtle') }}>
                  Step {stepIdx + 1} of {STEPS.length}
                </span>
              </Box>
            </FormHeader>

            {/* Step indicator pills */}
            <Box paddingBlockEnd="space.200">
              <Inline space="space.075">
                {STEPS.map((s, i) => (
                  <Box
                    key={s.id}
                    xcss={undefined}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background:
                        i <= stepIdx
                          ? token('color.background.brand.bold')
                          : token('color.background.neutral'),
                    }}
                  />
                ))}
              </Inline>
            </Box>

            <Stack space="space.150">
              {serverError && (
                <SectionMessage appearance="error" title="Couldn't create project">
                  <p>{serverError}</p>
                </SectionMessage>
              )}
              {stepBody}
            </Stack>

            <FormFooter>
              <Inline space="space.100" alignInline="end" grow="fill">
                <Button appearance="subtle" onClick={onCancel} isDisabled={submitting}>
                  Cancel
                </Button>
                {!isFirstStep && (
                  <Button appearance="default" onClick={goBack} isDisabled={submitting}>
                    Back
                  </Button>
                )}
                {!isLastStep ? (
                  <Button
                    appearance="primary"
                    onClick={() => { void goNext(); }}
                    isDisabled={submitting}
                    iconAfter={submitting ? () => <Spinner size="small" /> : undefined}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    appearance="primary"
                    onClick={() => { void handleSubmit(); }}
                    isDisabled={submitting}
                    iconAfter={submitting ? () => <Spinner size="small" /> : undefined}
                  >
                    {submitting ? 'Creating…' : 'Create project'}
                  </Button>
                )}
              </Inline>
            </FormFooter>
          </>
        )}
      </Form>
    </div>
  );
}

/** Sentinel — keeps the import graph from tree-shaking SpaceError out of the bundle. */
export const __WIZARD_ERROR_SENTINEL = SpaceError;
