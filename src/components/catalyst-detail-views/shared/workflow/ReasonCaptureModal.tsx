/**
 * ReasonCaptureModal — canonical workflow reason capture.
 *
 * Shown when a transition requires a reason (ph_wf_version_transitions.requires_reason
 * or the target status requires_reason). Surfaces ph_wf_reason_codes for the
 * transition type + a free-text field. Submit is blocked until a reason is given.
 */
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@atlaskit/button/new';
import { useReasonCodes } from '@/hooks/workflow-v2/useWorkflowFoundation';

export interface ReasonCaptureModalProps {
  entityType: string;
  itemKey?: string | null;
  itemTitle?: string | null;
  fromStatus: string | null;
  toStatus: string;
  versionLabel?: string | null;
  /** transition_type to filter reason codes (e.g. exception/cancel/reopen). */
  transitionType?: string | null;
  onSubmit: (reason: { code: string | null; text: string | null }) => void;
  onCancel: () => void;
}

export function ReasonCaptureModal(props: ReasonCaptureModalProps) {
  const { data: allCodes = [] } = useReasonCodes();
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);

  const codes = useMemo(
    () =>
      allCodes
        .filter((c) => c.is_active)
        .filter((c) => !props.transitionType || !c.transition_type || c.transition_type === props.transitionType),
    [allCodes, props.transitionType],
  );
  const selected = codes.find((c) => c.code === code);
  const needsFreeText = !!selected?.requires_free_text;
  // valid when a code is chosen (and its free-text requirement met), or free text given.
  const valid = (!!code && (!needsFreeText || !!text.trim())) || !!text.trim();

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', display: 'block', marginBottom: 4 };
  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '4px 8px', border: '1px solid var(--ds-border)', borderRadius: 4,
    background: 'var(--ds-surface)', color: 'var(--ds-text)', fontSize: 13, fontFamily: 'inherit',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reason required for transition"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ds-blanket)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) props.onCancel(); }}
    >
      <div style={{ width: 480, maxWidth: '92vw', background: 'var(--ds-surface-overlay, var(--ds-surface))', borderRadius: 8, boxShadow: 'var(--ds-shadow-overlay)', padding: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: 'var(--ds-text)' }}>Reason required</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ds-text-subtle)' }}>
          Moving {props.entityType} {props.itemKey ?? ''} from <strong>{props.fromStatus ?? '—'}</strong> to <strong>{props.toStatus}</strong>
          {props.versionLabel ? ` (${props.versionLabel})` : ''} requires a reason.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Reason code</label>
          <select style={fieldStyle} value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">Select a reason…</option>
            {codes.map((c) => <option key={c.id} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Details{needsFreeText ? ' (required)' : ' (optional)'}</label>
          <textarea style={{ ...fieldStyle, minHeight: 72, resize: 'vertical' }} value={text}
            onChange={(e) => setText(e.target.value)} placeholder="Add context for this transition…" />
        </div>

        {touched && !valid && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ds-text-danger)' }}>
            Select a reason code or enter a reason before continuing.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button appearance="subtle" onClick={props.onCancel}>Cancel</Button>
          <Button
            appearance="primary"
            onClick={() => {
              if (!valid) { setTouched(true); return; }
              props.onSubmit({ code: code || null, text: text.trim() || null });
            }}
          >
            Confirm transition
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
