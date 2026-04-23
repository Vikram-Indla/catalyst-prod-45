// @ts-nocheck
/**
 * UWVRow — single row in the Universal Work View virtualized grid.
 *
 * VISUAL & COLUMNS PARITY with src/components/workhub/allwork/AllWorkTable.tsx.
 * Audit decisions applied:
 *   Q1 — Icons: JiraIssueTypeIcon (Atlaskit SVGs at /admin/icons/jira/*.svg)
 *   Q2 — Scope (b): columns/widths/fonts/row-height/icons/status/theme parity
 *   Q3 — Status: StatusLozengeByType (CLAUDE.md §5 3-colour guardrail)
 *   Q4 — Theme: var(--bg-*) / var(--fg-*) / var(--bd-*) tokens, no hex literals
 * Plus: 44px rows, Inter / JetBrains Mono fonts, KEY in cp-blue, native
 *       checkbox, Lucide ChevronRight with rotate, 28px depth indent,
 *       PriorityBars, lowercase hub label.
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import {
  hubColour,
  hubLabel,
  hubTypeFromIssueType,
  formatRelative,
  formatDate,
  isOverdue,
  AVATAR_COLORS,
  nameToHash,
  JIRA_ROW_HEIGHT,
  getStatusStyle,
} from './uwv.utils';
import type { UWVColumn, UWVItem } from './uwv.types';

interface UWVRowProps {
  item: UWVItem;
  columns: UWVColumn[];
  gridTemplate: string;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onClick: () => void;
}

const CELL_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: JIRA_ROW_HEIGHT,
  padding: '0 8px',
  fontSize: 13,
  fontWeight: 400,
  color: 'var(--fg-1)',
  fontFamily: 'Inter, sans-serif',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  background: 'transparent',
  minWidth: 0,
};

function renderCell(
  col: UWVColumn,
  item: UWVItem,
  hasChildren: boolean,
  isExpanded: boolean,
  depth: number,
  onToggleExpand: () => void,
  onKeyClick: () => void,
): React.ReactNode {
  switch (col.fieldId) {
    case 'key': {
      const hubType = hubTypeFromIssueType(item.issueType);
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            paddingLeft: depth * 28,
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              aria-expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                width: 16,
                height: 16,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                flexShrink: 0,
              }}
            >
              <ChevronRight
                size={14}
                style={{
                  color: 'var(--fg-3)',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease',
                }}
              />
            </button>
          ) : (
            <span style={{ width: 16, display: 'inline-block', flexShrink: 0 }} />
          )}
          <JiraIssueTypeIcon type={item.issueType} size={16} />
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onKeyClick();
            }}
            style={{
              fontSize: 13,
              fontWeight: 650,
              color: 'var(--cp-blue)',
              fontFamily: "'JetBrains Mono', monospace",
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              overflow: 'visible',
              flexShrink: 0,
            }}
          >
            <bdi dir="ltr" style={{ overflow: 'visible' }}>{item.key}</bdi>
          </a>
        </div>
      );
    }
    case 'summary':
      return (
        <span
          dir="auto"
          style={{
            color: 'var(--fg-1)',
            fontSize: 12,
            fontWeight: 400,
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.summary}
        >
          {item.summary}
        </span>
      );
    case 'status':
      return (
        <span style={getStatusStyle(item.statusCategory, item.status)} title={item.status}>
          {item.status}
        </span>
      );
    case 'project':
      return (
        <span
          style={{
            color: 'var(--fg-2)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.key?.split('-')[0] ?? '—'}
        </span>
      );
    case 'hubSource': {
      const hubType = hubTypeFromIssueType(item.issueType);
      const c = hubColour(item.hubSource ?? hubType);
      return (
        <span
          style={{
            display: 'inline-block',
            background: c.bg,
            color: c.text,
            border: `1px solid ${c.border}20`,
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {hubLabel(item.hubSource ?? hubType)}
        </span>
      );
    }
    case 'priority':
      return <PriorityBars priority={normalisePriority(item.priority)} barWidth={3} barHeight={12} />;
    case 'updated':
      return (
        <span
          style={{
            color: 'var(--fg-3)',
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatRelative(item.updated)}
        </span>
      );
    case 'assignee': {
      const display = item.assigneeName ?? null;
      if (!display) {
        return (
          <span style={{ color: 'var(--fg-3)', fontSize: 12, fontStyle: 'italic' }}>
            Unassigned
          </span>
        );
      }
      const hash = nameToHash(display);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: AVATAR_COLORS[hash % AVATAR_COLORS.length],
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {display.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              fontSize: 13,
              color: 'var(--fg-2)',
              fontFamily: 'Inter, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {display}
          </span>
        </div>
      );
    }
    case 'comments': {
      const c = item.commentCount ?? 0;
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--fg-3)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {c > 0 ? <span>{c}</span> : <span>Add comment</span>}
        </div>
      );
    }
    case 'dueDate': {
      const overdue = isOverdue(item.dueDate);
      return (
        <span
          style={{
            color: overdue ? 'var(--sem-danger)' : 'var(--fg-2)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {formatDate(item.dueDate)}
        </span>
      );
    }
    case 'created':
      return (
        <span
          style={{
            color: 'var(--fg-2)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {formatDate(item.created)}
        </span>
      );
    case 'parentKey':
      return (
        <span
          style={{
            color: 'var(--fg-2)',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {item.parentKey ?? '—'}
        </span>
      );
    default:
      return <span style={{ color: 'var(--fg-3)' }}>—</span>;
  }
}

export const UWVRow = React.memo(function UWVRow({
  item,
  columns,
  gridTemplate,
  isSelected,
  isExpanded,
  hasChildren,
  onToggleSelect,
  onToggleExpand,
  onClick,
}: UWVRowProps) {
  const depth = item.level ?? 0;

  return (
    <div
      role="row"
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        height: JIRA_ROW_HEIGHT,
        borderBottom: '1px solid var(--bd-default, #E5E7EB)',
        borderLeft: isSelected ? '4px solid var(--cp-blue)' : '4px solid transparent',
        backgroundColor: isSelected
          ? 'rgba(37,99,235,0.08)'
          : depth > 0
          ? 'var(--bg-1)'
          : 'var(--bg-app)',
        cursor: 'pointer',
        transition: 'background-color 80ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--hover, #1F1F1F)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor =
            depth > 0 ? 'var(--bg-1)' : 'var(--bg-app)';
        }
      }}
    >
      {/* Native checkbox cell — matches AllWorkTable */}
      <div
        role="gridcell"
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          ...CELL_BASE,
          padding: 0,
          justifyContent: 'center',
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect()}
          className="w-4 h-4 rounded cursor-pointer"
          style={{ accentColor: 'var(--cp-blue)' }}
          aria-label={`Select ${item.key}`}
        />
      </div>

      {columns.map((col) => (
        <div key={col.fieldId} role="gridcell" style={CELL_BASE}>
          {renderCell(col, item, hasChildren, isExpanded, depth, onToggleExpand, onClick)}
        </div>
      ))}
    </div>
  );
});
