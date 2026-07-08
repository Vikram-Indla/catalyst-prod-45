/**
 * ComposerTranslateBanner — write-side AR→EN mode for the chat composer
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S4b, Zendesk conversation-mode model).
 *
 * Appears ONLY while the composer contains Arabic-script text and the user's
 * translate mode isn't 'never' (conditional visibility — research rule #1).
 * It never translates by itself: it arms "send as English", and the actual
 * translation happens at send time behind a preview (see MessageComposer) —
 * a mistranslation sent is worse than friction, so no blind sends.
 */
import React from 'react';
import Button from '@atlaskit/button/new';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import type { TranslateMode } from '@/features/voice-flow/useVoiceSettings';

interface Props {
  mode: TranslateMode;
  onModeChange: (mode: TranslateMode) => void;
  /** Per-conversation arm state — ON means the next send previews English. */
  armed: boolean;
  onArmedChange: (armed: boolean) => void;
}

export function ComposerTranslateBanner({ mode, onModeChange, armed, onArmedChange }: Props) {
  return (
    <div
      data-translate-banner
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '4px 8px',
        borderRadius: 6,
        border: '1px solid var(--ds-border)',
        background: 'var(--ds-background-neutral-subtle)',
        font: 'var(--ds-font-body-small)',
        color: 'var(--ds-text-subtle)',
        marginBottom: 4,
      }}
    >
      <CatyPulseIcon size={14} title="CatyFlow translate" />
      <span style={{ flex: 1, minWidth: 120 }}>
        {armed
          ? 'Will send as English — you review the translation first.'
          : 'Composing in Arabic — send as English?'}
      </span>
      <Button
        appearance={armed ? 'primary' : 'default'}
        spacing="compact"
        onClick={() => onArmedChange(!armed)}
      >
        {armed ? 'AR → EN on' : 'AR → EN'}
      </Button>
      {mode !== 'always' && armed && (
        <Button appearance="subtle" spacing="compact" onClick={() => onModeChange('always')}>
          Always
        </Button>
      )}
      <Button
        appearance="subtle"
        spacing="compact"
        onClick={() => {
          onArmedChange(false);
          onModeChange('never');
        }}
      >
        Never
      </Button>
    </div>
  );
}

export default ComposerTranslateBanner;
