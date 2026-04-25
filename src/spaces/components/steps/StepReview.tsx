// ============================================================================
// src/spaces/components/steps/StepReview.tsx
// Step 4 of 4 — read-only summary before Create.
// Atlaskit primitives + tokens only.
// ============================================================================

import { Stack } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import type { CreateSpaceDraft } from '../../types';
import { SPACE_PURPOSE_LABEL, SPACE_PERMISSION_LABEL } from '../../types';

interface Props {
  draft: CreateSpaceDraft;
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '6px 0' }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: token('color.text.subtlest'),
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 14,
            color: token('color.text'),
            wordBreak: 'break-word',
          }}
        >
          {children}
        </span>
      </div>
    </div>
  );
}

export function StepReview({ draft }: Props) {
  const enabledFeatures = [
    draft.features.enableComments && 'Comments',
    draft.features.enableAttachments && 'Attachments',
    draft.features.enableLikes && 'Reactions',
  ].filter(Boolean) as string[];

  return (
    <Stack space="space.150">
      <div>
        <Heading size="small">Review</Heading>
        <div style={{ paddingTop: 4 }}>
          <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
            Confirm the details below, then create the project.
          </span>
        </div>
      </div>

      <div
        style={{
          padding: 16,
          backgroundColor: token('color.background.neutral.subtle'),
          borderRadius: 6,
          border: `1px solid ${token('color.border')}`,
        }}
      >
        <Row label="Name">{draft.name || <em style={{ color: token('color.text.subtlest') }}>(empty)</em>}</Row>
        <Row label="Key">
          <code
            style={{
              fontFamily: 'var(--cp-font-mono)',
              fontSize: 13,
              padding: '2px 6px',
              borderRadius: 3,
              background: token('color.background.neutral'),
            }}
          >
            {draft.key || '—'}
          </code>
        </Row>
        <Row label="Purpose">{SPACE_PURPOSE_LABEL[draft.purpose]}</Row>
        <Row label="Description">
          {draft.description.trim()
            ? draft.description
            : <em style={{ color: token('color.text.subtlest') }}>(none)</em>}
        </Row>
        <Row label="Permissions">{SPACE_PERMISSION_LABEL[draft.permissionScheme]}</Row>
        <Row label="Visibility">
          {draft.isPrivate ? (
            <Lozenge appearance="moved">Private</Lozenge>
          ) : (
            <Lozenge appearance="default">Workspace</Lozenge>
          )}
        </Row>
        <Row label="Features">
          {enabledFeatures.length === 0
            ? <em style={{ color: token('color.text.subtlest') }}>(none)</em>
            : enabledFeatures.join(' · ')}
        </Row>
      </div>
    </Stack>
  );
}
