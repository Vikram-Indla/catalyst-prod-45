/**
 * ImproveDescriptionDialog — side-by-side diff modal for the
 * "Improve description" menu item under the Improve dropdown.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2):
 *   Mirrors Jira's "Improve description" UX. Calls the
 *   `ai-improve-story` edge function with `improve_type:
 *   'improve_description_v2'` so the backend selects per-type
 *   prompt focus from PER_TYPE_FOCUS. Shows the AI's improved
 *   description + acceptance criteria side-by-side with the
 *   originals — per-field Accept / Reject buttons. Accept calls
 *   the consumer-supplied `onApply` for that field; Reject just
 *   marks that field decided. Modal closes when both fields are
 *   either accepted or rejected (or via Cancel).
 *
 *   Implementation uses a manual `createPortal` (not
 *   `@atlaskit/modal-dialog`) — same documented portal-empty
 *   workaround as `DangerConfirmModal` (CLAUDE.md L1, L21,
 *   the new lesson on the BacklogPage surface). Esc closes;
 *   backdrop click does NOT (destructive-style protection).
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import {
  IMPROVE_SUB_TYPES,
  type ImproveSubType,
  improveTriggerLabel,
} from './improve-config';

interface ImproveDescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Issue type — drives the trigger label and the prompt focus. */
  issueType?: string | null;
  /** Issue summary (title) — used as prompt context. */
  issueSummary?: string | null;
  /** Current description text — shown in the "Original" column. */
  currentDescription?: string | null;
  /** Current acceptance criteria — shown in the "Original" column. */
  currentAcceptanceCriteria?: string | null;
  /** Called when the user accepts the AI-improved description. */
  onApplyDescription?: (newDescription: string) => void | Promise<void>;
  /** Called when the user accepts the AI-improved acceptance criteria. */
  onApplyAcceptanceCriteria?: (newAC: string) => void | Promise<void>;
}

type AiOutput = { description: string; acceptance_criteria: string };

export function ImproveDescriptionDialog({
  isOpen,
  onClose,
  issueType,
  issueSummary,
  currentDescription,
  currentAcceptanceCriteria,
  onApplyDescription,
  onApplyAcceptanceCriteria,
}: ImproveDescriptionDialogProps) {
  const [subType, setSubType] = useState<ImproveSubType>('improve_clarify');
  const [focusHint, setFocusHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<AiOutput | null>(null);
  const [descAccepted, setDescAccepted] = useState<'accepted' | 'rejected' | null>(null);
  const [acAccepted, setAcAccepted] = useState<'accepted' | 'rejected' | null>(null);

  // Reset whenever we open / close.
  useEffect(() => {
    if (!isOpen) {
      setSubType('improve_clarify');
      setFocusHint('');
      setLoading(false);
      setError(null);
      setOutput(null);
      setDescAccepted(null);
      setAcAccepted(null);
    }
  }, [isOpen]);

  // Esc to close (CLAUDE.md L1 — same pattern as DangerConfirmModal).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, loading, onClose]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    setDescAccepted(null);
    setAcAccepted(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
        body: {
          improve_type: 'improve_description_v2',
          issue_type: issueType || 'Default',
          improve_sub_type: subType,
          focus_hint: focusHint.trim() || null,
          issue_summary: issueSummary || '',
          current_description: currentDescription || '',
          current_ac: currentAcceptanceCriteria || '',
        },
      });
      if (fnError) throw fnError;
      if (!data || (typeof data === 'object' && 'error' in data && data.error)) {
        throw new Error((data as { error?: string })?.error || 'AI gateway error');
      }
      const out = data as AiOutput;
      setOutput({
        description: typeof out.description === 'string' ? out.description : '',
        acceptance_criteria: typeof out.acceptance_criteria === 'string' ? out.acceptance_criteria : '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI features temporarily unavailable. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const acceptDesc = async () => {
    if (!output) return;
    setDescAccepted('accepted');
    if (onApplyDescription) await onApplyDescription(output.description);
  };
  const rejectDesc = () => setDescAccepted('rejected');

  const acceptAc = async () => {
    if (!output) return;
    setAcAccepted('accepted');
    if (onApplyAcceptanceCriteria) await onApplyAcceptanceCriteria(output.acceptance_criteria);
  };
  const rejectAc = () => setAcAccepted('rejected');

  // Modal closes when both fields are decided.
  useEffect(() => {
    if (descAccepted && acAccepted) {
      const t = setTimeout(onClose, 400);
      return () => clearTimeout(t);
    }
  }, [descAccepted, acAccepted, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const triggerLabel = improveTriggerLabel(issueType);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9, 30, 66, 0.54)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 56,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${triggerLabel} — improve description`}
        data-testid="improve-description-dialog"
        style={{
          width: 920,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 96px)',
          background: token('elevation.surface.overlay', '#FFFFFF'),
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 12px',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                lineHeight: '24px',
                color: token('color.text', '#292A2E'),
              }}
            >
              {triggerLabel} — Improve description
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: token('color.text.subtle', '#6B6E76'),
              }}
            >
              Atlassian-Intelligence-style refinement. Per-type prompt focus is applied automatically.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 24px',
            alignItems: 'flex-end',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 240 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: token('color.text.subtle', '#6B6E76'),
                marginBottom: 4,
              }}
            >
              Improvement type
            </label>
            <Select<{ label: string; value: ImproveSubType }>
              inputId="improve-sub-type"
              isCompact
              menuPlacement="auto"
              value={IMPROVE_SUB_TYPES.find((o) => o.id === subType)
                ? { label: IMPROVE_SUB_TYPES.find((o) => o.id === subType)!.label, value: subType }
                : null}
              options={IMPROVE_SUB_TYPES.map((o) => ({ label: o.label, value: o.id }))}
              onChange={(v) => v && setSubType(v.value)}
            />
          </div>
          <div style={{ flex: '2 1 360px' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: token('color.text.subtle', '#6B6E76'),
                marginBottom: 4,
              }}
            >
              Optional focus hint
            </label>
            <Textfield
              placeholder="e.g. include API edge cases / mention SLA tier 1 / call out RTL behaviour"
              value={focusHint}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFocusHint(e.target.value)}
              isCompact
              autoComplete="off"
            />
          </div>
          <div>
            <Button
              appearance="primary"
              onClick={generate}
              isLoading={loading}
              isDisabled={loading}
            >
              {output ? 'Regenerate' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: 4,
                background: token('color.background.danger', '#FFEBE6'),
                color: token('color.text.danger', '#AE2A19'),
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {!output && !loading && !error && (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: token('color.text.subtle', '#6B6E76'),
                fontSize: 14,
              }}
            >
              Pick an improvement type, add an optional focus hint, then click <strong>Generate</strong>.
            </div>
          )}

          {output && (
            <>
              <DiffRow
                label="Description"
                original={currentDescription || '(empty)'}
                improved={output.description}
                state={descAccepted}
                onAccept={acceptDesc}
                onReject={rejectDesc}
              />
              <DiffRow
                label="Acceptance criteria"
                original={currentAcceptanceCriteria || '(none)'}
                improved={output.acceptance_criteria}
                state={acAccepted}
                onAccept={acceptAc}
                onReject={rejectAc}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 24px',
            borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
          }}
        >
          <Button appearance="subtle" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface DiffRowProps {
  label: string;
  original: string;
  improved: string;
  state: 'accepted' | 'rejected' | null;
  onAccept: () => void;
  onReject: () => void;
}

function DiffRow({ label, original, improved, state, onAccept, onReject }: DiffRowProps) {
  return (
    <div
      style={{
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: token('color.background.neutral', '#F4F5F7'),
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: token('color.text.subtle', '#6B6E76'),
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {state === 'accepted' && (
            <span style={{ fontSize: 12, color: token('color.text.success', '#216E4E'), fontWeight: 600 }}>
              ✓ Applied
            </span>
          )}
          {state === 'rejected' && (
            <span style={{ fontSize: 12, color: token('color.text.subtle', '#6B6E76'), fontWeight: 600 }}>
              Skipped
            </span>
          )}
          {state === null && (
            <>
              <Button appearance="subtle" spacing="compact" onClick={onReject}>
                Reject
              </Button>
              <Button appearance="primary" spacing="compact" onClick={onAccept}>
                Accept
              </Button>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div
          style={{
            padding: 12,
            fontSize: 13,
            lineHeight: '18px',
            color: token('color.text.subtle', '#42526E'),
            background: token('elevation.surface', '#FFFFFF'),
            borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
            whiteSpace: 'pre-wrap',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: token('color.text.subtlest', '#6B778C'),
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 6,
            }}
          >
            Original
          </div>
          {original}
        </div>
        <div
          style={{
            padding: 12,
            fontSize: 13,
            lineHeight: '18px',
            color: token('color.text', '#292A2E'),
            background: token('color.background.success', '#E3FCEF'),
            whiteSpace: 'pre-wrap',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: token('color.text.success', '#216E4E'),
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 6,
            }}
          >
            Improved
          </div>
          {improved}
        </div>
      </div>
    </div>
  );
}
