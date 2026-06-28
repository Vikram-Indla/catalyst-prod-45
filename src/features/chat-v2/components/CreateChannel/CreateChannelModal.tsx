import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '../shared/Icon';

interface CreateChannelModalProps {
  workspaceName: string;
  onClose: () => void;
  onCreate: (input: { name: string; isPrivate: boolean }) => Promise<void> | void;
}

interface NamePrefix {
  prefix: string;
  hint: string;
}
const PREFIX_HINTS: NamePrefix[] = [
  { prefix: 'help', hint: 'For questions, assistance, and resources on a topic' },
  { prefix: 'proj', hint: 'For collaboration on and discussion about a project' },
  { prefix: 'team', hint: 'For updates and work from a department or team' },
];

const MAX_NAME_LEN = 80;

function sanitizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_\-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_NAME_LEN);
}

export function CreateChannelModal({
  workspaceName,
  onClose,
  onCreate,
}: CreateChannelModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const cleanName = sanitizeName(name);
  const canAdvance = cleanName.length > 0;

  const [hintsOpen, setHintsOpen] = useState(true);

  const handlePrefixPick = (prefix: string) => {
    setName(prefix);
    setHintsOpen(false);
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    if (!canAdvance || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({ name: cleanName, isPrivate });
    } catch (e) {
      console.error('[chat-v2] create channel failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create a channel"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
    >
      <div
        style={{
          width: 560,
          maxWidth: '90vw',
          background: 'var(--cv2-bg-modal)',
          color: 'var(--cv2-text)',
          fontFamily: 'var(--cv2-font)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          padding: 24,
        }}
      >
        <Header step={step} channelName={cleanName} onClose={onClose} />

        {step === 1 ? (
          <NameStep
            name={name}
            cleanName={cleanName}
            inputRef={inputRef}
            hintsOpen={hintsOpen}
            onFocusInput={() => { /* keep current state */ }}
            onChange={value => { setName(value); setHintsOpen(false); }}
            onPickPrefix={handlePrefixPick}
            onNext={() => canAdvance && setStep(2)}
          />
        ) : (
          <VisibilityStep
            workspaceName={workspaceName}
            isPrivate={isPrivate}
            onChange={setIsPrivate}
          />
        )}

        <Footer
          step={step}
          canAdvance={canAdvance}
          submitting={submitting}
          onBack={() => setStep(1)}
          onNext={() => canAdvance && setStep(2)}
          onCreate={() => void handleCreate()}
        />
      </div>
    </div>,
    document.body,
  );
}

function Header({
  step,
  channelName,
  onClose,
}: {
  step: 1 | 2;
  channelName: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}
    >
      <div>
        <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
          Create a channel
        </div>
        {step === 2 && channelName && (
          <div
            style={{
              marginTop: 4,
              fontSize: 'var(--ds-font-size-300)',
              color: 'var(--cv2-text-subtle)',
            }}
          >
            <span style={{ marginRight: 4 }}>#</span>{channelName}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          width: 28,
          height: 28,
          background: 'transparent',
          color: 'var(--cv2-text-subtle)',
          border: 'none',
          borderRadius: 'var(--cv2-radius-sm)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}

function NameStep({
  name,
  cleanName,
  inputRef,
  hintsOpen,
  onFocusInput,
  onChange,
  onPickPrefix,
  onNext,
}: {
  name: string;
  cleanName: string;
  inputRef: React.RefObject<HTMLInputElement>;
  hintsOpen: boolean;
  onFocusInput: () => void;
  onChange: (value: string) => void;
  onPickPrefix: (prefix: string) => void;
  onNext: () => void;
}) {
  const remaining = MAX_NAME_LEN - cleanName.length;
  return (
    <div>
      <label
        htmlFor="cv2-channel-name"
        style={{ display: 'block', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, marginBottom: 6 }}
      >
        Name
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          background: 'var(--cv2-bg-input)',
          border: '1px solid var(--cv2-accent)',
          borderRadius: 'var(--cv2-radius-sm)',
        }}
      >
        <span aria-hidden="true" style={{ color: 'var(--cv2-text-subtle)', fontSize: 'var(--ds-font-size-400)' }}>#</span>
        <input
          ref={inputRef}
          id="cv2-channel-name"
          type="text"
          value={name}
          onFocus={onFocusInput}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. plan-budget"
          maxLength={MAX_NAME_LEN}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          name="cv2-channel-name"
          onKeyDown={e => { if (e.key === 'Enter') onNext(); }}
          style={{
            flex: 1,
            background: 'transparent',
            color: 'var(--cv2-text)',
            border: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 'var(--ds-font-size-400)',
          }}
        />
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cv2-text-muted)' }}>{remaining}</span>
      </div>
      {hintsOpen && (
      <div
        style={{
          marginTop: 10,
          padding: '10px 12px',
          background: 'var(--cv2-bg-input)',
          border: '1px solid var(--cv2-border)',
          borderRadius: 'var(--cv2-radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {PREFIX_HINTS.map(p => (
          <button
            key={p.prefix}
            type="button"
            onClick={() => onPickPrefix(p.prefix)}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              textAlign: 'left',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-400)',
              color: 'var(--cv2-text)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontWeight: 700 }}>{p.prefix}</span>
            <span style={{ color: 'var(--cv2-text-muted)' }}>- {p.hint}</span>
          </button>
        ))}
      </div>
      )}
    </div>
  );
}

function VisibilityStep({
  workspaceName,
  isPrivate,
  onChange,
}: {
  workspaceName: string;
  isPrivate: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 700, marginBottom: 8 }}>Visibility</div>
      <RadioRow
        checked={!isPrivate}
        onSelect={() => onChange(false)}
        title={
          <>
            Public — anyone in <strong>{workspaceName}</strong>
          </>
        }
      />
      <RadioRow
        checked={isPrivate}
        onSelect={() => onChange(true)}
        title="Private — only specific people"
        subtitle="Can only be viewed or joined by invitation"
      />
    </div>
  );
}

function RadioRow({
  checked,
  onSelect,
  title,
  subtitle,
}: {
  checked: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
        padding: '10px 0',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--cv2-text)',
        fontFamily: 'inherit',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `2px solid ${checked ? 'var(--cv2-accent)' : 'var(--cv2-border-strong)'}`,
          background: 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          marginTop: 2,
        }}
      >
        {checked && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--cv2-accent)',
            }}
          />
        )}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--cv2-text-strong)' }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cv2-text-muted)', marginTop: 2 }}>
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}

function Footer({
  step,
  canAdvance,
  submitting,
  onBack,
  onNext,
  onCreate,
}: {
  step: 1 | 2;
  canAdvance: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cv2-text-muted)' }}>Step {step} of 2</span>
      <div style={{ display: 'inline-flex', gap: 8 }}>
        {step === 2 && (
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 18px',
              background: 'transparent',
              color: 'var(--cv2-text)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        )}
        {step === 1 ? (
          <PrimaryButton disabled={!canAdvance} onClick={onNext} label="Next" />
        ) : (
          <PrimaryButton
            disabled={!canAdvance || submitting}
            onClick={onCreate}
            label={submitting ? 'Creating…' : 'Create'}
          />
        )}
      </div>
    </div>
  );
}

function PrimaryButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 18px',
        background: disabled ? 'var(--cv2-bg-row-hover)' : 'var(--cv2-success)',
        color: disabled ? 'var(--cv2-text-muted)' : 'var(--ds-text-inverse)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
