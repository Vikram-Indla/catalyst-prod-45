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
 *   2026-05-17 FIX: Moved from inline render (cramped inside the narrow
 *   right sidebar) to a proper @atlaskit/modal-dialog overlay at width=900.
 *   The 2-column diff grid requires ~880px to render comfortably; rendering
 *   inline in a ~380px sidebar was the root cause of "horrible" Improve UX.
 */

import React, { useEffect, useState } from 'react';
import Button from '@atlaskit/button/new';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
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

  const triggerLabel = improveTriggerLabel(issueType);

  return (
    <ModalDialog onClose={onClose} width={900}>
      <ModalHeader hasCloseButton>
        <ModalTitle>
          Improve description
        </ModalTitle>
      </ModalHeader>

      <ModalBody>
        {/* Subtitle */}
        <p style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle', 'var(--ds-text-subtlest, #6B6E76)') }}>
          Atlassian-Intelligence-style refinement. Per-type prompt focus is applied automatically.
        </p>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            alignItems: 'flex-end',
            padding: '12px 16px',
            background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken, #F7F8F9)'),
            borderRadius: 6,
            border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 240 }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 600,
                color: token('color.text.subtle', 'var(--ds-text-subtlest, #6B6E76)'),
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
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 600,
                color: token('color.text.subtle', 'var(--ds-text-subtlest, #6B6E76)'),
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

        {/* Diff output */}
        <div
          style={{
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
                background: token('color.background.danger', 'var(--ds-background-danger, #FFECEB)'),
                color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
                fontSize: 'var(--ds-font-size-300)',
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
                color: token('color.text.subtle', 'var(--ds-text-subtlest, #6B6E76)'),
                fontSize: 'var(--ds-font-size-400)',
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
      </ModalBody>

      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </ModalDialog>
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
        border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
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
          background: token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)'),
          borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
        }}
      >
        <span
          style={{
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 700,
            color: token('color.text.subtle', 'var(--ds-text-subtlest, #6B6E76)'),
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {state === 'accepted' && (
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.success', 'var(--ds-text-success, #216E4E)'), fontWeight: 600 }}>
              ✓ Applied
            </span>
          )}
          {state === 'rejected' && (
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle', 'var(--ds-text-subtlest, #6B6E76)'), fontWeight: 600 }}>
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
            fontSize: 'var(--ds-font-size-300)',
            lineHeight: '18px',
            color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
            background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
            borderRight: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
            whiteSpace: 'pre-wrap',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 700,
              color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
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
            fontSize: 'var(--ds-font-size-300)',
            lineHeight: '18px',
            color: token('color.text', 'var(--ds-text, #172B4D)'),
            background: token('color.background.success', 'var(--ds-background-success, #DFFCF0)'),
            whiteSpace: 'pre-wrap',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 700,
              color: token('color.text.success', 'var(--ds-text-success, #216E4E)'),
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
