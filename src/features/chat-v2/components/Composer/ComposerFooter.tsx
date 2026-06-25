import React, { useRef, useState } from 'react';
import { AaIcon, AtIcon, ChevronDownIcon, MicIcon, PlusIcon, SendIcon, SmileyIcon } from '../shared/Icon';
import { ScheduleSendMenu } from '../Schedule/ScheduleSendMenu';

export type VoiceMode = 'auto' | 'en' | 'ar';

interface ComposerFooterProps {
  canSend: boolean;
  showFormatToolbar: boolean;
  onToggleFormatToolbar: () => void;
  onAttach: () => void;
  onPickEmoji: () => void;
  onMention: () => void;
  onSend: () => void;
  onSchedule: (whenIso: string) => void;
  micSupported?: boolean;
  micActive?: boolean;
  onMicToggle?: () => void;
  voiceMode?: VoiceMode;
  onVoiceModeChange?: (mode: VoiceMode) => void;
}

export function ComposerFooter({
  canSend,
  showFormatToolbar,
  onToggleFormatToolbar,
  onAttach,
  onPickEmoji,
  onMention,
  onSend,
  onSchedule,
  micSupported = false,
  micActive = false,
  onMicToggle,
  voiceMode = 'auto',
  onVoiceModeChange,
}: ComposerFooterProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const scheduleAnchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '6px 8px',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <FooterBtn label="Attach" onClick={onAttach}>
          <PlusIcon size={16} />
        </FooterBtn>
        <Divider />
        <FooterBtn
          label="Formatting"
          active={showFormatToolbar}
          onClick={onToggleFormatToolbar}
        >
          <AaIcon size={16} />
        </FooterBtn>
        <FooterBtn label="Emoji" onClick={onPickEmoji}>
          <SmileyIcon size={16} />
        </FooterBtn>
        {micSupported && onMicToggle && (
          <>
            <Divider />
            <MicFooterBtn
              active={micActive}
              onToggle={onMicToggle}
              voiceMode={voiceMode}
              onVoiceModeChange={onVoiceModeChange}
            />
          </>
        )}
        <FooterBtn label="Mention" onClick={onMention}>
          <AtIcon size={16} />
        </FooterBtn>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'stretch',
          background: canSend ? 'var(--cv2-accent)' : 'transparent',
          color: canSend ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--cv2-text-muted)',
          border: canSend ? '1px solid var(--cv2-accent)' : '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-sm)',
          overflow: 'hidden',
          transition: 'background var(--cv2-transition-fast)',
        }}
      >
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          title="Send"
          style={{
            width: 34,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: 'inherit',
            border: 'none',
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          <SendIcon size={15} />
        </button>
        <span
          aria-hidden="true"
          style={{
            width: 1,
            background: canSend ? 'var(--ds-surface, rgba(255,255,255,0.25))' : 'var(--cv2-border-strong)',
          }}
        />
        <button
          ref={scheduleAnchorRef}
          type="button"
          onClick={() => setScheduleOpen(true)}
          aria-label="Schedule message"
          title="Schedule message"
          aria-haspopup="menu"
          aria-expanded={scheduleOpen}
          style={{
            width: 24,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: 'inherit',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ChevronDownIcon size={12} />
        </button>
      </div>
      {scheduleOpen && (
        <ScheduleSendMenu
          anchorRef={scheduleAnchorRef}
          onPick={iso => {
            setScheduleOpen(false);
            onSchedule(iso);
          }}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  );
}

function FooterBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--cv2-bg-row-active)' : 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast), color var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-strong)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-subtle)';
        }
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 1,
        height: 16,
        background: 'var(--cv2-border-strong)',
        margin: '0 4px',
      }}
    />
  );
}

const LANG_CHIPS: Array<{ id: VoiceMode; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'EN' },
  { id: 'ar', label: 'AR' },
];

function MicFooterBtn({
  active,
  onToggle,
  voiceMode,
  onVoiceModeChange,
}: {
  active: boolean;
  onToggle: () => void;
  voiceMode: VoiceMode;
  onVoiceModeChange?: (mode: VoiceMode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const label = active ? 'Stop voice recording' : 'Record voice';

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && !active && onVoiceModeChange && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 4,
            background: 'var(--cv2-bg-panel)',
            border: '1px solid var(--cv2-border-strong)',
            borderRadius: 999,
            padding: '3px 6px',
            boxShadow: '0 2px 8px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.14))',
            whiteSpace: 'nowrap',
            pointerEvents: 'all',
            zIndex: 10,
          }}
        >
          {LANG_CHIPS.map(({ id, label: chipLabel }) => {
            const sel = voiceMode === id;
            return (
              <button
                key={id}
                type="button"
                onMouseDown={e => {
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
                  background: sel ? 'var(--cv2-bg-row-active)' : 'transparent',
                  color: sel ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
                  cursor: 'pointer',
                }}
              >
                {chipLabel}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={onToggle}
        aria-label={label}
        aria-pressed={active}
        title={label}
        style={{
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? 'var(--cv2-danger, #E2483D)' : 'transparent',
          color: active ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--cv2-text-subtle)',
          border: 'none',
          borderRadius: 'var(--cv2-radius-sm)',
          cursor: 'pointer',
          transition: 'background var(--cv2-transition-fast), color var(--cv2-transition-fast)',
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-strong)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-subtle)';
          }
        }}
      >
        <MicIcon size={16} />
      </button>
    </div>
  );
}
