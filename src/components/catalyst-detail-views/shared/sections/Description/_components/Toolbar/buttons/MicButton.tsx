import { useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import MicrophoneIcon from '@atlaskit/icon/core/microphone';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  voiceMode?: 'auto' | 'en' | 'ar';
  onVoiceModeChange?: (mode: 'auto' | 'en' | 'ar') => void;
}

const LANG_CHIPS: Array<{ id: 'auto' | 'en' | 'ar'; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'EN' },
  { id: 'ar', label: 'AR' },
];

export function MicButton({
  active = false,
  disabled = false,
  onClick,
  voiceMode = 'auto',
  onVoiceModeChange,
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <style>{`
        .caty-mic-lang-picker {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          background: var(--ds-surface-overlay, #FFFFFF);
          border: 1px solid var(--ds-border, #DFE1E6);
          border-radius: 999px;
          padding: 3px 6px;
          box-shadow: 0 2px 8px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.14));
          white-space: nowrap;
          pointer-events: all;
          z-index: 10;
        }
      `}</style>

      <div
        style={{ position: 'relative', display: 'inline-flex' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Language picker — shown on hover when not active */}
        {hovered && !active && onVoiceModeChange && (
          <div className="caty-mic-lang-picker">
            {LANG_CHIPS.map(({ id, label }) => {
              const sel = voiceMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onVoiceModeChange(id);
                  }}
                  style={{
                    padding: '2px 8px',
                    border: 'none',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: sel ? 600 : 400,
                    background: sel
                      ? 'var(--ds-background-selected, #E9F2FE)'
                      : 'transparent',
                    color: sel
                      ? 'var(--ds-text-selected, #0C66E4)'
                      : 'var(--ds-text-subtle, #6B778C)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <ToolbarIconButton
          label={active ? 'Stop voice recording' : 'Record voice'}
          active={active}
          disabled={disabled}
          onClick={onClick}
          testId="catalyst-desc-toolbar-mic"
        >
          <MicrophoneIcon label="" />
        </ToolbarIconButton>
      </div>
    </>
  );
}
