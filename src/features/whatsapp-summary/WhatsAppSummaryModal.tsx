/**
 * WhatsAppSummaryModal — AI-authored WhatsApp status update modal.
 *
 * Options: summary type + recipient role (from admin access management role enum).
 * Auto-generates on open. Preview editable before copy.
 */
import React, { useEffect } from 'react';
import ModalDialog, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useWhatsAppSummary } from './useWhatsAppSummary';
import type { WhatsAppSummaryOptions, RecipientRole, SummaryType } from './types';

// ── Role options — mirrors ROLE_GROUPS in AdminAccessPage ────────────────────

const RECIPIENT_ROLE_OPTIONS: { label: string; value: RecipientRole }[] = [
  { label: 'Business owner',       value: 'business_owner' },
  { label: 'Product owner',        value: 'product_owner' },
  { label: 'Product manager',      value: 'product_manager' },
  { label: 'Project manager',      value: 'project_manager' },
  { label: 'Governance',           value: 'governance' },
  { label: 'PMO',                  value: 'pmo' },
  { label: 'Admin',                value: 'admin' },
  { label: 'Release manager',      value: 'release_manager' },
  { label: 'Architect',            value: 'architect' },
  { label: 'Developer',            value: 'developer' },
  { label: 'QA tester',            value: 'qa_tester' },
  { label: 'Operations engineer',  value: 'operations_engineer' },
  { label: 'Technical support',    value: 'technical_support' },
  { label: 'Support',              value: 'support' },
  { label: 'Project coordinator',  value: 'project_coordinator' },
  { label: 'Guest',                value: 'guest' },
];

const SUMMARY_TYPE_OPTIONS: { label: string; value: SummaryType }[] = [
  { label: 'Full update',      value: 'full' },
  { label: 'Progress only',    value: 'progress' },
  { label: 'Blockers only',    value: 'blockers' },
  { label: 'ETA & dates only', value: 'eta' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function findOpt<T extends string>(
  opts: readonly { value: T; label: string }[],
  value: T,
) {
  return opts.find(o => o.value === value) ?? opts[0];
}

// ── Phase indicator ───────────────────────────────────────────────────────────

function PhaseIndicator({ phase, errorMessage }: { phase: string; errorMessage: string | null }) {
  if (phase === 'building_context' || phase === 'generating') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: token('color.text.subtle') }}>
        <Spinner size="small" />
        <span style={{ fontSize: 'var(--ds-font-size-300)' }}>
          {phase === 'building_context' ? 'Building context…' : 'Generating with Gemini…'}
        </span>
      </div>
    );
  }
  if (phase === 'fallback') {
    return (
      <div style={{
        background: token('color.background.warning'),
        border: `1px solid ${token('color.border.warning')}`,
        borderRadius: 3,
        padding: '8px 12px',
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: token('color.text.warning') }}>
          AI generation failed — showing count-based fallback
        </div>
        {errorMessage && (
          <div style={{
            fontFamily: 'var(--ds-font-family-code, monospace)',
            fontSize: 'var(--ds-font-size-100)',
            color: token('color.text.subtle'),
            marginTop: 2,
          }}>
            {errorMessage}
          </div>
        )}
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div style={{
        background: token('color.background.danger'),
        border: `1px solid ${token('color.border.danger')}`,
        borderRadius: 3,
        padding: '8px 12px',
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: token('color.text.danger') }}>
          {errorMessage ?? 'Something went wrong'}
        </div>
      </div>
    );
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

interface WhatsAppSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterName: string;
  filterJql: string;
  projectKey: string | null;
  rows: JqlResultRow[];
  isLoadingRows?: boolean;
}

export function WhatsAppSummaryModal({
  isOpen,
  onClose,
  filterName,
  filterJql,
  projectKey,
  rows,
  isLoadingRows = false,
}: WhatsAppSummaryModalProps) {
  const { state, setOptions, setEditableText, generate, retry, copyToClipboard, reset } =
    useWhatsAppSummary(filterName, filterJql, projectKey, rows);

  // Reset when the filter itself changes (different filterName = different context)
  useEffect(() => {
    reset();
  }, [filterName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate only when there is no prior output (phase idle = no cached result)
  useEffect(() => {
    if (!isOpen) return;
    if (isLoadingRows) return;
    if (rows.length === 0) return;
    if (state.phase !== 'idle') return;
    generate();
  }, [isOpen, isLoadingRows, rows.length, state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const isGenerating = state.phase === 'building_context' || state.phase === 'generating';
  const hasOutput = state.phase === 'ready' || state.phase === 'fallback';
  const { options } = state;

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--ds-font-size-100)',
    fontWeight: 600,
    color: token('color.text.subtlest'),
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  function handleSummaryTypeChange(value: SummaryType) {
    setOptions({ summaryType: value });
    // Re-generate with new type if we already have output
    if (hasOutput || isGenerating) {
      generate({ summaryType: value });
    }
  }

  function handleRoleChange(value: RecipientRole) {
    setOptions({ recipientRole: value });
    if (hasOutput || isGenerating) {
      generate({ recipientRole: value });
    }
  }

  return (
    <ModalTransition>
      {isOpen && (
        <ModalDialog onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>WhatsApp summary</ModalTitle>
          </ModalHeader>

          <ModalBody>
            {/* ── Filter badge ──────────────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <Lozenge appearance="inprogress">{filterName}</Lozenge>
            </div>

            {/* ── Options row ───────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Summary type</label>
                <Select
                  options={SUMMARY_TYPE_OPTIONS}
                  value={findOpt(SUMMARY_TYPE_OPTIONS, options.summaryType)}
                  onChange={v => v && handleSummaryTypeChange(v.value as SummaryType)}
                  menuPosition="fixed"
                  isDisabled={isGenerating}
                />
              </div>
              <div>
                <label style={labelStyle}>Recipient role</label>
                <Select
                  options={RECIPIENT_ROLE_OPTIONS}
                  value={findOpt(RECIPIENT_ROLE_OPTIONS, options.recipientRole)}
                  onChange={v => v && handleRoleChange(v.value as RecipientRole)}
                  menuPosition="fixed"
                  isDisabled={isGenerating}
                />
              </div>
            </div>

            {/* ── Phase indicator ───────────────────────────────────────────── */}
            <PhaseIndicator phase={state.phase} errorMessage={state.errorMessage} />

            {/* ── Loading rows ──────────────────────────────────────────────── */}
            {isLoadingRows && state.phase === 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: token('color.text.subtlest'), fontSize: 'var(--ds-font-size-300)' }}>
                <Spinner size="small" />
                Loading filter results…
              </div>
            )}

            {!isLoadingRows && rows.length === 0 && state.phase === 'idle' && (
              <div style={{ padding: '10px 0', color: token('color.text.subtlest'), fontSize: 'var(--ds-font-size-300)' }}>
                No items in this filter.
              </div>
            )}

            {/* ── Editable preview ──────────────────────────────────────────── */}
            {hasOutput && (
              <>
                {state.isTruncated && (
                  <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.warning'), marginBottom: 6 }}>
                    Showing {state.itemCountUsed} of {rows.length} items — summary may be incomplete.
                  </div>
                )}
                {state.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle'), marginBottom: 4 }}>{w}</div>
                ))}
                <textarea
                  value={state.editableText}
                  onChange={e => setEditableText(e.target.value)}
                  rows={12}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--ds-font-family-body)',
                    fontSize: 'var(--ds-font-size-400)',
                    lineHeight: 1.5,
                    color: token('color.text'),
                    background: token('color.background.input'),
                    border: `2px solid ${token('color.border.input')}`,
                    borderRadius: 3,
                    padding: '8px 12px',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = token('color.border.focused'); }}
                  onBlur={e => { e.target.style.borderColor = token('color.border.input'); }}
                  aria-label="WhatsApp summary — edit before copying"
                />
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>

            {/* Retry — only shown when output exists */}
            {hasOutput && (
              <Button appearance="subtle" onClick={retry} isDisabled={isGenerating}>
                Retry
              </Button>
            )}

            {/* Generate — only shown before first output */}
            {!hasOutput && !isGenerating && (
              <Button
                appearance="subtle"
                onClick={() => generate()}
                isDisabled={isLoadingRows || rows.length === 0}
              >
                Generate
              </Button>
            )}

            {/* Copy — primary, always available once output exists */}
            {hasOutput && (
              <Button
                appearance="primary"
                onClick={() => { copyToClipboard(); onClose(); }}
                isDisabled={!state.editableText}
              >
                Copy
              </Button>
            )}
          </ModalFooter>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}
