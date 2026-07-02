import React, { useState } from 'react';
import Lozenge from '@atlaskit/lozenge';
import { AlertTriangle, Clock, ExternalLink, ChevronDown, ChevronRight } from '@/lib/atlaskit-icons';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { Tooltip } from '@/components/ads/Tooltip';
import type { HealthAttentionItem } from '@/features/health/types';

interface AttentionItemCardProps {
  item: HealthAttentionItem;
  onOpen: (item: HealthAttentionItem) => void;
}

function priorityAppearance(priority: string | null): 'removed' | 'inprogress' | 'moved' | 'new' | 'default' | 'success' {
  switch ((priority ?? '').toLowerCase()) {
    case 'critical': return 'removed';
    case 'high': return 'moved';
    case 'medium': return 'inprogress';
    default: return 'default';
  }
}

function riskBandAppearance(band: string): 'removed' | 'moved' | 'inprogress' | 'default' {
  switch (band) {
    case 'Critical': return 'removed';
    case 'High': return 'moved';
    case 'Medium': return 'inprogress';
    default: return 'default';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AttentionItemCard({ item, onOpen }: AttentionItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = item.riskBand === 'Critical'
    ? 'var(--ds-border-danger)'
    : item.riskBand === 'High'
    ? 'var(--ds-border-warning)'
    : 'var(--ds-border)';

  return (
    <div
      style={{
        background: 'var(--ds-surface-raised)',
        border: `1px solid var(--ds-border)`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 6,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      {/* Top row: key + title + open link */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {item.itemKey && (
            <div style={{
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 700,
              color: 'var(--ds-text-subtlest)',
              fontFamily: 'monospace',
              marginBottom: 4,
            }}>
              {item.itemKey}
            </div>
          )}
          <div style={{
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 600,
            color: 'var(--ds-text)',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.title ?? '(untitled)'}
          </div>
        </div>
        <button
          onClick={() => onOpen(item)}
          title="Open work item"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '4px 8px', border: '1px solid var(--ds-border)',
            borderRadius: 4, background: 'var(--ds-surface)',
            color: 'var(--ds-link)', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Open <ExternalLink size={10} />
        </button>
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
        <Lozenge appearance={riskBandAppearance(item.riskBand)}>
          {item.riskBand} · {item.attentionScore}
        </Lozenge>
        {item.status && <Lozenge appearance="inprogress">{item.status}</Lozenge>}
        {item.priority && <Lozenge appearance={priorityAppearance(item.priority)}>{item.priority}</Lozenge>}
        {item.type && <Lozenge appearance="default">{item.type}</Lozenge>}

        {/* Assignee */}
        <Tooltip content={item.assignee?.name ?? 'Unassigned'}>
          <span style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--ds-font-size-100)',
            color: item.assignee?.name ? 'var(--ds-text-subtle)' : 'var(--ds-text-danger)',
          }}>
            <CatalystAvatar name={item.assignee?.name ?? null} size="xsmall" />
            {item.assignee?.name ?? 'Unassigned'}
          </span>
        </Tooltip>
      </div>

      {/* Primary reason */}
      <div style={{
        display: 'flex', gap: 6, alignItems: 'flex-start',
        background: 'var(--ds-surface-sunken)', borderRadius: 4, padding: '8px',
      }}>
        <AlertTriangle size={13} style={{ color: 'var(--ds-icon-warning)', flexShrink: 0, marginTop: 0 }} />
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--ds-text)' }}>{item.primaryReason}</strong>
          {item.secondaryReasons.length > 0 && (
            <span style={{ color: 'var(--ds-text-subtlest)' }}>
              {' '}· {item.secondaryReasons[0]}
            </span>
          )}
        </span>
      </div>

      {/* Dates row */}
      {(item.dueDate || item.lastUpdated) && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {item.dueDate && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 'var(--ds-font-size-100)',
              color: item.daysOverdue ? 'var(--ds-text-danger)' : 'var(--ds-text-subtle)',
            }}>
              <Clock size={11} />
              Due: {formatDate(item.dueDate)}
              {item.daysOverdue && ` (${item.daysOverdue}d overdue)`}
            </span>
          )}
          {item.lastUpdated && (
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
              Last updated: {formatDate(item.lastUpdated)}
            </span>
          )}
          {item.sprintName && (
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
              Sprint: {item.sprintName}
            </span>
          )}
        </div>
      )}

      {/* Recommended action */}
      <div style={{
        display: 'flex', gap: 5, alignItems: 'flex-start',
        borderTop: '1px solid var(--ds-border)', paddingTop: 8,
      }}>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', fontWeight: 700, flexShrink: 0 }}>→</span>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)', fontStyle: 'italic', lineHeight: 1.4 }}>
          {item.recommendedAction}
        </span>
      </div>

      {/* Expandable: all signals */}
      {item.secondaryReasons.length > 1 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-link)', padding: 0,
            }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {expanded ? 'Hide signals' : `${item.signals.length} signals`}
          </button>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 8 }}>
              {item.signals.map((s, i) => (
                <span key={i} style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
                  · {s.label} <span style={{ color: 'var(--ds-text-subtlest)' }}>(+{s.weight})</span>
                </span>
              ))}
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 4 }}>
                Score: {item.attentionScore} · Confidence: {item.confidence}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
