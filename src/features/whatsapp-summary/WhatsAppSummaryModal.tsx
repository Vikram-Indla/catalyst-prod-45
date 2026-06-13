/**
 * WhatsAppSummaryModal — AI-authored WhatsApp status update modal.
 *
 * Atlaskit-only. Hand-rolled textarea for the editable preview (no
 * @atlaskit/textarea available in the project's installed packages).
 * All other controls use ADS tokens and @atlaskit/* components.
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
import { Checkbox } from '@atlaskit/checkbox';
import Spinner from '@atlaskit/spinner';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useWhatsAppSummary } from './useWhatsAppSummary';
import type { WhatsAppSummaryOptions } from './types';

// ── Select option builders ────────────────────────────────────────────────────

function opt<T extends string>(value: T, label: string) {
  return { value, label };
}

const SUMMARY_TYPE_OPTIONS = [
  opt('full',     'Full update'),
  opt('progress', 'Progress only'),
  opt('blockers', 'Blockers only'),
  opt('eta',      'ETA & dates only'),
] as const;

const AUDIENCE_OPTIONS = [
  opt('stakeholder', 'Business stakeholder'),
  opt('executive',   'Senior executive'),
  opt('team',        'Delivery team'),
] as const;

const TONE_OPTIONS = [
  opt('formal', 'Formal'),
  opt('casual', 'Casual'),
] as const;

const SCOPE_OPTIONS = [
  opt('all',         'All items'),
  opt('in_progress', 'In progress only'),
  opt('blocked',     'Blocked only'),
  opt('due_soon',    'Due in 7 days'),
] as const;

const TIME_OPTIONS = [
  opt('last_7_days',    'Last 7 days'),
  opt('last_14_days',   'Last 14 days'),
  opt('last_30_days',   'Last 30 days'),
  opt('current_sprint', 'Current sprint'),
  opt('all_time',       'All time'),
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function findOpt<T extends string>(
  opts: readonly { value: T; label: string }[],
  value: T,
) {
  return opts.find(o => o.value === value) ?? opts[0];
}

// ── Phase labels / UI states ──────────────────────────────────────────────────

function PhaseIndicator({ phase, errorMessage }: { phase: string; errorMessage: string | null }) {
  if (phase === 'building_context' || phase === 'generating') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: token('color.text.subtle', '#42526E') }}>
        <Spinner size="small" />
        <span style={{ fontSize: 13 }}>
          {phase === 'building_context' ? 'Building context…' : 'Generating with Gemini…'}
        </span>
      </div>
    );
  }
  if (phase === 'fallback') {
    return (
      <div style={{ background: token('color.background.warning', '#FFF7D6'), border: `1px solid ${token('color.border.warning', '#E2B203')}`, borderRadius: 3, padding: '8px 12px', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: token('color.text.warning', '#974F0C') }}>AI generation failed</div>
        <div style={{ fontSize: 12, color: token('color.text.subtle', '#42526E'), marginTop: 2 }}>
          Showing a count-based fallback. Edit below or retry.
          {errorMessage && <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 }}>{errorMessage}</span>}
        </div>
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div style={{ background: token('color.background.danger', '#FFECEB'), border: `1px solid ${token('color.border.danger', '#E34935')}`, borderRadius: 3, padding: '8px 12px', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: token('color.text.danger', '#AE2A19') }}>
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
}

export function WhatsAppSummaryModal({
  isOpen,
  onClose,
  filterName,
  filterJql,
  projectKey,
  rows,
}: WhatsAppSummaryModalProps) {
  const { state, setOptions, setEditableText, generate, retry, copyToClipboard, reset } =
    useWhatsAppSummary(filterName, filterJql, projectKey, rows);

  // Reset state when modal re-opens
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = state.phase === 'building_context' || state.phase === 'generating';
  const hasOutput = state.phase === 'ready' || state.phase === 'fallback';
  const { options } = state;

  function handleOptionChange<K extends keyof WhatsAppSummaryOptions>(
    key: K,
    value: WhatsAppSummaryOptions[K],
  ) {
    setOptions({ [key]: value } as Partial<WhatsAppSummaryOptions>);
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: token('color.text.subtlest', '#6B778C'),
    marginBottom: 4,
    display: 'block',
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 16,
  };

  return (
    <ModalTransition>
      {isOpen && (
        <ModalDialog onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Copy WhatsApp summary</ModalTitle>
          </ModalHeader>

          <ModalBody>
            {/* ── Options ─────────────────────────────────────────────────── */}
            {!hasOutput && (
              <>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>Summary type</label>
                    <Select
                      options={SUMMARY_TYPE_OPTIONS as unknown as { value: string; label: string }[]}
                      value={findOpt(SUMMARY_TYPE_OPTIONS, options.summaryType)}
                      onChange={v => v && handleOptionChange('summaryType', v.value as WhatsAppSummaryOptions['summaryType'])}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Audience</label>
                    <Select
                      options={AUDIENCE_OPTIONS as unknown as { value: string; label: string }[]}
                      value={findOpt(AUDIENCE_OPTIONS, options.audience)}
                      onChange={v => v && handleOptionChange('audience', v.value as WhatsAppSummaryOptions['audience'])}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                </div>

                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>Tone</label>
                    <Select
                      options={TONE_OPTIONS as unknown as { value: string; label: string }[]}
                      value={findOpt(TONE_OPTIONS, options.tone)}
                      onChange={v => v && handleOptionChange('tone', v.value as WhatsAppSummaryOptions['tone'])}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Time period</label>
                    <Select
                      options={TIME_OPTIONS as unknown as { value: string; label: string }[]}
                      value={findOpt(TIME_OPTIONS, options.timePeriod)}
                      onChange={v => v && handleOptionChange('timePeriod', v.value as WhatsAppSummaryOptions['timePeriod'])}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Item scope</label>
                  <Select
                    options={SCOPE_OPTIONS as unknown as { value: string; label: string }[]}
                    value={findOpt(SCOPE_OPTIONS, options.itemScope)}
                    onChange={v => v && handleOptionChange('itemScope', v.value as WhatsAppSummaryOptions['itemScope'])}
                    menuPortalTarget={document.body}
                      menuPosition="fixed"
                  />
                </div>

                <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
                  <Checkbox
                    label="Include blockers"
                    isChecked={options.includeBlockers}
                    onChange={e => handleOptionChange('includeBlockers', e.target.checked)}
                  />
                  <Checkbox
                    label="Include ETAs"
                    isChecked={options.includeEta}
                    onChange={e => handleOptionChange('includeEta', e.target.checked)}
                  />
                  <Checkbox
                    label="Include decisions needed"
                    isChecked={options.includeDecisions}
                    onChange={e => handleOptionChange('includeDecisions', e.target.checked)}
                  />
                </div>

                {rows.length === 0 && (
                  <div style={{ padding: '12px 0', color: token('color.text.subtlest', '#6B778C'), fontSize: 13 }}>
                    No items in this filter. Load the filter results first.
                  </div>
                )}
              </>
            )}

            {/* ── Phase indicator (loading / error / fallback) ────────────── */}
            <PhaseIndicator phase={state.phase} errorMessage={state.errorMessage} />

            {/* ── Editable preview ────────────────────────────────────────── */}
            {hasOutput && (
              <>
                {state.isTruncated && (
                  <div style={{ fontSize: 12, color: token('color.text.warning', '#974F0C'), marginBottom: 8 }}>
                    Showing {state.itemCountUsed} of {rows.length} items — summary may be incomplete.
                  </div>
                )}
                {state.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: token('color.text.subtle', '#42526E'), marginBottom: 4 }}>{w}</div>
                ))}
                <textarea
                  value={state.editableText}
                  onChange={e => setEditableText(e.target.value)}
                  rows={12}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--ds-font-family-body)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: token('color.text', '#172B4D'),
                    background: token('color.background.input', '#FAFBFC'),
                    border: `2px solid ${token('color.border.input', '#DFE1E6')}`,
                    borderRadius: 3,
                    padding: '8px 12px',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = token('color.border.focused', '#388BFF'); }}
                  onBlur={e => { e.target.style.borderColor = token('color.border.input', '#DFE1E6'); }}
                  aria-label="WhatsApp summary — edit before copying"
                />
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>

            {!hasOutput && (
              <Button
                appearance="primary"
                onClick={generate}
                isDisabled={isLoading || rows.length === 0}
                isLoading={isLoading}
              >
                Generate
              </Button>
            )}

            {hasOutput && (
              <>
                <Button
                  appearance="subtle"
                  onClick={() => { reset(); }}
                >
                  Change options
                </Button>
                <Button
                  appearance="subtle"
                  onClick={retry}
                  isDisabled={isLoading}
                >
                  Retry
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => { copyToClipboard(); onClose(); }}
                  isDisabled={!state.editableText}
                >
                  Copy
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}
