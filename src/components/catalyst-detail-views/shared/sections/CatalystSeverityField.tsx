/**
 * CatalystSeverityField — Inline-editable Severity field.
 *
 * Closed state: bordered chip showing the current value (or "None").
 * Open state:   bordered input-style field (blue border) with the current
 *               value as plain text + X clear (if a value) + chevron-down,
 *               and a portaled dropdown beneath with bordered-chip options.
 *
 * Pattern mirrors CatalystParentLinker. Allowed values come from Jira's
 * customfield_10125 schema: Blocker, High, Medium, Low.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import CrossCircleIcon from '@atlaskit/icon/glyph/cross-circle';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { supabase } from '@/integrations/supabase/client';
import type { PhIssue } from '../types';

interface Props {
  issue: PhIssue | null;
  onUpdate?: () => void;
}

const SEVERITY_VALUES = ['Blocker', 'High', 'Medium', 'Low'] as const;
type SeverityValue = (typeof SEVERITY_VALUES)[number];

function SeverityChip({ value }: { value: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ds-text, #292A2E)',
        background: 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  );
}

export function CatalystSeverityField({ issue, onUpdate }: Props) {
  const current = ((issue as any)?.severity
    ?? (issue as any)?.raw_json?.fields?.customfield_10125?.value
    ?? null) as SeverityValue | null;

  const [showPicker, setShowPicker] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (value: string | null) => {
      if (!issue?.issue_key && !issue?.id) throw new Error('No issue identifier');
      const query = issue.issue_key
        ? supabase.from('ph_issues').update({ severity: value } as any).eq('issue_key', issue.issue_key)
        : supabase.from('ph_issues').update({ severity: value } as any).eq('id', issue.id);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      setShowPicker(false);
      onUpdate?.();
    },
  });

  // Outside click closes
  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setShowPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPicker]);

  // Position the portaled dropdown under the trigger
  useEffect(() => {
    if (!showPicker) { setPickerPos(null); return; }
    const recompute = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPickerPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 180) });
    };
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [showPicker]);

  return (
    <div ref={triggerRef}>
      {showPicker ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '2px solid var(--ds-border-focused, #388BFF)',
            borderRadius: 4, padding: '2px 6px',
            background: 'var(--ds-background-input, #fff)',
          }}
        >
          <span
            style={{
              flex: 1, fontSize: 14,
              color: current ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtlest, #8993A4)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {current ?? 'Select severity'}
          </span>
          {current && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateMutation.mutate(null);
              }}
              aria-label="Clear severity"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                flexShrink: 0,
              }}
            >
              <CrossCircleIcon label="Clear severity" size="small" primaryColor="var(--ds-text-subtle, #5E6C84)" />
            </button>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <ChevronDownIcon label="" size="large" primaryColor="var(--ds-text-subtle, #5E6C84)" />
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          style={{
            display: 'flex', alignItems: 'center', width: '100%',
            background: 'none', border: '2px solid transparent', cursor: 'pointer',
            padding: '2px 6px', borderRadius: 4,
            fontFamily: 'inherit', textAlign: 'left',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          {current
            ? <SeverityChip value={current} />
            : <span style={{ fontSize: 14, color: 'var(--ds-text-subtle, #5E6C84)' }}>None</span>}
        </button>
      )}

      {showPicker && pickerPos && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed', top: pickerPos.top, left: pickerPos.left, width: pickerPos.width,
            background: 'var(--ds-surface, #fff)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 6,
            boxShadow: '0 8px 16px rgba(9,30,66,0.15)',
            zIndex: 1000, padding: '6px 0',
          }}
        >
          {SEVERITY_VALUES.map((v) => {
            const isSelected = current === v;
            return (
              <div
                key={v}
                onClick={() => updateMutation.mutate(v)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '6px 12px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--ds-background-information, #DEEBFF)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--ds-border-focused, #388BFF)' : '3px solid transparent',
                  transition: 'background 80ms',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'var(--ds-background-information, #DEEBFF)' : 'transparent'; }}
              >
                <SeverityChip value={v} />
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default CatalystSeverityField;
