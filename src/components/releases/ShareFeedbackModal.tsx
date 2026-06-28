/**
 * ShareFeedbackModal — "Share your thoughts" feedback dialog.
 *
 * Jira-parity layout:
 *   - Header: "Share your thoughts" + close
 *   - Subtitle: "Required fields are marked with an asterisk *"
 *   - Select feedback * (Choose one → 4 options)
 *   - Conditional: Let us know what's on your mind * (textarea, red border on error)
 *   - Catalyst opt-in checkboxes (×2)
 *   - Footer: Cancel + Send feedback
 *
 * Persists to public.catalyst_feedback.
 */
import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import { Checkbox } from '@atlaskit/checkbox';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystFlag } from '@/lib/catalystFlag';

type Category = 'ask_question' | 'leave_comment' | 'report_bug' | 'suggest_improvement';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'ask_question', label: 'Ask a question' },
  { value: 'leave_comment', label: 'Leave a comment' },
  { value: 'report_bug', label: 'Report a bug' },
  { value: 'suggest_improvement', label: 'Suggest an improvement' },
];

const BLUE = 'var(--ds-border-selected, #1868DB)';
const RED = 'var(--ds-text-danger, #AE2A19)';
const RED_BORDER = 'var(--ds-border-danger, #AE2A19)';
const GRAY_BORDER = 'var(--ds-border, #DFE1E6)';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text, #172B4D)',
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)',
  color: RED,
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const asterisk = (
  <span style={{ color: RED, marginLeft: 2 }}>*</span>
);

// ───────────────────────── Inline category dropdown ─────────────────────────
function CategoryDropdown({
  value,
  onChange,
  hasError,
}: {
  value: Category | null;
  onChange: (v: Category) => void;
  hasError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useLayoutEffect(() => { if (open) update(); }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
    };
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const selected = CATEGORY_OPTIONS.find((o) => o.value === value);
  const borderColor = open ? BLUE : hasError ? RED_BORDER : GRAY_BORDER;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={hasError}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: 40,
          padding: '0 12px',
          borderRadius: 3,
          border: `1px solid ${borderColor}`,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          color: selected ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtlest, #6B778C)',
          fontSize: 'var(--ds-font-size-400)',
          fontFamily: 'inherit',
          cursor: 'pointer',
          outline: 'none',
          textAlign: 'left',
          boxShadow: open ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
        }}
      >
        <span>{selected ? selected.label : 'Choose one'}</span>
        <span
          style={{
            display: 'inline-flex',
            marginLeft: 8,
            color: 'var(--ds-text-subtle, #6B778C)',
            transition: 'transform 120ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDownIcon label="" size="medium" />
        </span>
      </button>
      {open && pos && createPortal(
        <div
          ref={popupRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 10001,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '6px 0',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <CategoryRow
              key={opt.value}
              checked={value === opt.value}
              label={opt.label}
              onSelect={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function CategoryRow({
  checked, label, onSelect,
}: { checked: boolean; label: string; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const showBar = checked || hover;
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: 'unset',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 12px 8px 16px',
        cursor: 'pointer',
        background: checked
          ? 'var(--ds-background-selected, #E9F2FE)'
          : hover
          ? 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)'
          : 'transparent',
        fontSize: 'var(--ds-font-size-400)',
        color: checked ? 'var(--ds-text-selected, #0C66E4)' : 'var(--ds-text, #292A2E)',
        fontWeight: checked ? 500 : 400,
      }}
    >
      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: showBar ? BLUE : 'transparent',
        borderRadius: '0 2px 2px 0',
      }} />
      {label}
    </button>
  );
}

// ───────────────────────── Modal ─────────────────────────

interface ShareFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareFeedbackModal({ isOpen, onClose }: ShareFeedbackModalProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [contactOptIn, setContactOptIn] = useState(false);
  const [researchOptIn, setResearchOptIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!category) e.category = 'Please select a feedback type';
    if (category && !description.trim()) e.description = 'Please provide a description';
    return e;
  }, [category, description]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to send feedback');
      const { error } = await supabase.from('catalyst_feedback').insert({
        user_id: user.id,
        category: category!,
        description: description.trim(),
        contact_opt_in: contactOptIn,
        product_research_opt_in: researchOptIn,
        source_route: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      catalystFlag.success('Thanks for your feedback!');
      handleClose();
    },
    onError: (err: any) => {
      catalystFlag.error(err?.message || 'Could not send feedback');
    },
  });

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    sendMutation.mutate();
  };

  const handleClose = () => {
    setCategory(null);
    setDescription('');
    setContactOptIn(false);
    setResearchOptIn(false);
    setSubmitted(false);
    onClose();
  };

  const showDescriptionError = submitted && !!errors.description;
  const showCategoryError = submitted && !!errors.category;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width="medium">
          <ModalHeader hasCloseButton>
            <ModalTitle>Share your thoughts</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle, #505258)' }}>
                Required fields are marked with an asterisk
                <span style={{ color: RED, marginLeft: 2 }}>*</span>
              </div>

              {/* Select feedback */}
              <div>
                <label style={labelStyle}>
                  Select feedback{asterisk}
                </label>
                <CategoryDropdown
                  value={category}
                  onChange={(v) => setCategory(v)}
                  hasError={showCategoryError}
                />
                {showCategoryError && (
                  <div role="alert" style={errStyle}>
                    <span aria-hidden="true">⚠</span> {errors.category}
                  </div>
                )}
              </div>

              {/* Description (only after category chosen) */}
              {category && (
                <div>
                  <label style={labelStyle} htmlFor="feedback-description">
                    Let us know what's on your mind{asterisk}
                  </label>
                  <div
                    style={{
                      borderRadius: 3,
                      border: showDescriptionError ? `1px solid ${RED_BORDER}` : 'none',
                      padding: showDescriptionError ? 0 : 0,
                    }}
                  >
                    <TextArea
                      id="feedback-description"
                      value={description}
                      onChange={(e) => setDescription((e.currentTarget as HTMLTextAreaElement).value)}
                      isInvalid={showDescriptionError}
                      minimumRows={5}
                    />
                  </div>
                  {showDescriptionError && (
                    <div role="alert" style={errStyle}>
                      <span aria-hidden="true">⚠</span> {errors.description}
                    </div>
                  )}
                </div>
              )}

              {/* Opt-in checkboxes — only shown after category picked */}
              {category && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text, #292A2E)' }}>
                  Catalyst opt-in options
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #292A2E)' }}>
                  <Checkbox
                    isChecked={contactOptIn}
                    onChange={(e) => setContactOptIn((e.target as HTMLInputElement).checked)}
                  />
                  <span>
                    Yes, Catalyst teams can contact me to learn about my experiences to improve Catalyst apps and services. I acknowledge the{' '}
                    <a
                      href="https://www.atlassian.com/legal/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--ds-link, #0052CC)' }}
                    >
                      Catalyst Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #292A2E)' }}>
                  <Checkbox
                    isChecked={researchOptIn}
                    onChange={(e) => setResearchOptIn((e.target as HTMLInputElement).checked)}
                  />
                  <span>I'd like to participate in product research</span>
                </label>
              </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              isLoading={sendMutation.isPending}
              isDisabled={sendMutation.isPending}
              onClick={handleSubmit}
            >
              Send feedback
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
