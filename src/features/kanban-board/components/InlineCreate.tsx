/**
 * InlineCreate — column footer "+ Create" → expanded card form matching Jira:
 * summary input + type picker + due-date picker + return/submit. Creates a work
 * item in the shared ph_issues source (source='catalyst').
 */
import React, { useState, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import AddIcon from '@atlaskit/icon/glyph/add';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import { IssueTypeIcon } from './IssueTypeIcon';
import { PortalMenu, MenuItem } from './PortalMenu';
import { SIZES, STRINGS } from '../constants';
import type { StatusCategory } from '../types';

const CREATABLE_TYPES = ['Story', 'Task', 'QA Bug', 'Epic'];

interface Props {
  projectKey: string;
  status: string;
  category: StatusCategory;
  onCreate: (summary: string, issueType: string, dueDate: string | null) => Promise<void>;
}

export const InlineCreate: React.FC<Props> = ({ status, onCreate }) => {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [issueType, setIssueType] = useState('Story');
  const [dueDate, setDueDate] = useState('');
  const [showDue, setShowDue] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  useEffect(() => { if (showDue) dueRef.current?.showPicker?.(); }, [showDue]);

  const submit = async () => {
    const s = summary.trim();
    if (!s || busy) return;
    setBusy(true);
    try { await onCreate(s, issueType, dueDate || null); setSummary(''); setDueDate(''); setShowDue(false); ref.current?.focus(); }
    finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: 'calc(100% - 16px)',
          padding: '6px 8px', margin: '2px 8px 4px', border: 'none', borderRadius: SIZES.CARD_RADIUS,
          background: 'transparent', color: token('color.text.subtle', 'var(--ds-icon)'),
          fontSize: 'var(--ds-font-size-400)', fontFamily: 'inherit', cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <AddIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
        {STRINGS.CREATE_ISSUE}
      </button>
    );
  }

  return (
    <div style={{
      margin: '2px 8px 4px', padding: 8, display: 'flex', flexDirection: 'column', gap: 8,
      background: token('elevation.surface.raised', 'var(--ds-surface)'),
      border: `2px solid ${token('color.border.focused', 'var(--ds-background-information-bold)')}`, borderRadius: SIZES.CARD_RADIUS,
      boxShadow: token('elevation.shadow.raised', '0 1px 1px #091E4240, 0 0 1px #091E424F'),
    }}>
      <input
        ref={ref}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setSummary(''); setOpen(false); } }}
        onBlur={() => { if (!summary.trim() && !showDue) setOpen(false); }}
        placeholder={STRINGS.CREATE_PLACEHOLDER}
        aria-label={`Create work item in ${status}`}
        disabled={busy}
        style={{
          width: '100%', minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 'var(--ds-font-size-400)', lineHeight: '20px', color: token('color.text', 'var(--ds-text)'), fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Type picker */}
        <PortalMenu ariaLabel="Work type" minWidth={160} trigger={() => (
          <span role="button" aria-label={`Work type: ${issueType}`} style={{ display: 'inline-flex', cursor: 'pointer', padding: 2, borderRadius: 3 }}>
            <IssueTypeIcon issueType={issueType} size={16} />
          </span>
        )}>
          {(close) => CREATABLE_TYPES.map((t) => (
            <MenuItem key={t} variant="plain" onClick={() => { setIssueType(t); close(); ref.current?.focus(); }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IssueTypeIcon issueType={t} size={16} />{t}</span>
            </MenuItem>
          ))}
        </PortalMenu>

        {/* Due date */}
        <button
          aria-label="Set due date"
          onClick={() => setShowDue((v) => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2, border: 'none', background: dueDate ? token('color.background.selected', 'var(--ds-background-selected)') : 'transparent', borderRadius: 3, padding: 2, cursor: 'pointer' }}
        >
          <CalendarIcon label="" size="small" primaryColor={dueDate ? token('color.icon.selected', 'var(--ds-link)') : token('color.icon.subtle', 'var(--ds-icon-subtle, var(--ds-text-subtlest))')} />
          {dueDate && <span style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.selected', 'var(--ds-link)') }}>{dueDate.slice(5)}</span>}
        </button>
        {showDue && (
          <input
            ref={dueRef} type="date" value={dueDate}
            onChange={(e) => { setDueDate(e.target.value); setShowDue(false); }}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          />
        )}

        <div style={{ flex: 1 }} />

        {/* Return / submit */}
        <button
          aria-label="Create work item"
          onClick={submit}
          disabled={busy || !summary.trim()}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
            border: `1px solid ${token('color.border', '#091E4224')}`, borderRadius: 3,
            background: token('elevation.surface', 'var(--ds-surface)'), cursor: summary.trim() ? 'pointer' : 'not-allowed',
            opacity: summary.trim() ? 1 : 0.5,
            color: token('color.icon.subtle', 'var(--ds-icon-subtle)'), fontSize: 'var(--ds-font-size-400)', lineHeight: 1,
          }}
        >
          ↵
        </button>
      </div>
    </div>
  );
};
