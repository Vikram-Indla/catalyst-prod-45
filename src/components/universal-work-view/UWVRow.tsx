// @ts-nocheck
/**
 * UWVRow — single row in the Universal Work View virtualized grid.
 *
 * Pixel-perfect parity with JiraTable / BacklogPage.atlaskit.tsx (Project Work table).
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Checkbox from '@atlaskit/checkbox';
import Avatar from '@atlaskit/avatar';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { resolveAvatarUrl } from '@/lib/avatars';
import {
  hubColour,
  hubLabel,
  hubTypeFromIssueType,
  formatDate,
  isOverdue,
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
  color: '#292A2E',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  background: 'transparent',
  minWidth: 0,
};

function formatUpdatedShort(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

function KeyLink({ keyText, onClick }: { keyText: string; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--cp-blue)',
        fontFamily: 'var(--cp-font-mono)',
        textDecoration: hover ? 'underline' : 'none',
        background: hover ? '#E9F2FF' : 'transparent',
        padding: '1px 4px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {keyText}
    </a>
  );
}

function renderCell(
  col: UWVColumn,
  item: UWVItem,
  hasChildren: boolean,
  isExpanded: boolean,
  onToggleExpand: () => void,
  onKeyClick: () => void,
): React.ReactNode {
  switch (col.fieldId) {
    case 'key': {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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
              {isExpanded ? (
                <ChevronDown size={14} color="var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))" />
              ) : (
                <ChevronRight size={14} color="var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))" />
              )}
            </button>
          ) : (
            <span style={{ width: 16, display: 'inline-block', flexShrink: 0 }} />
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <JiraIssueTypeIcon type={item.issueType} size={16} />
          </span>
          <KeyLink keyText={item.key} onClick={onKeyClick} />
        </div>
      );
    }
    case 'summary':
      return (
        <span
          dir="auto"
          style={{
            color: '#292A2E',
            fontSize: 13,
            fontWeight: 400,
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
            color: 'var(--ds-text-subtle, #505258)',
            fontSize: 13,
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
          }}
        >
          {hubLabel(item.hubSource ?? hubType)}
        </span>
      );
    }
    case 'priority':
      return (
        <PriorityBars
          priority={normalisePriority(item.priority)}
          barWidth={4}
          barHeight={16}
          borderRadius={1}
        />
      );
    case 'updated':
      return (
        <span
          style={{
            color: 'var(--ds-text-subtle, #505258)',
            fontSize: 13,
            fontFamily: 'var(--cp-font-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatUpdatedShort(item.updated)}
        </span>
      );
    case 'assignee': {
      const display = item.assigneeName ?? null;
      if (!display) {
        return (
          <span style={{ color: 'var(--ds-text-subtlest, #6B6E76)', fontSize: 12, fontStyle: 'italic' }}>
            Unassigned
          </span>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Avatar
            appearance="circle"
            size="small"
            src={resolveAvatarUrl(display) ?? item.assigneeAvatar ?? undefined}
            name={display}
          />
          <span
            style={{
              fontSize: 14,
              color: '#292A2E',
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
            color: 'var(--ds-text-subtlest, #6B6E76)',
            fontSize: 13,
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
            color: overdue ? 'var(--sem-danger)' : 'var(--ds-text-subtle, #505258)',
            fontSize: 13,
          }}
        >
          {formatDate(item.dueDate)}
        </span>
      );
    }
    case 'created':
      return (
        <span style={{ color: 'var(--ds-text-subtle, #505258)', fontSize: 13 }}>
          {formatDate(item.created)}
        </span>
      );
    case 'parentKey':
      return (
        <span
          style={{
            color: 'var(--ds-text-subtle, #505258)',
            fontSize: 12,
            fontFamily: 'var(--cp-font-mono)',
            maxWidth: 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.parentKey ?? '—'}
        </span>
      );
    default:
      return <span style={{ color: 'var(--ds-text-subtlest, #6B6E76)' }}>—</span>;
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
  const selectedShadow = 'inset 3px 0 0 #0C66E4, inset 0 -1px 0 0 #E4E6EA';
  const restShadow = 'inset 0 -1px 0 0 #E4E6EA';

  return (
    <div
      role="row"
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        height: JIRA_ROW_HEIGHT,
        boxShadow: isSelected ? selectedShadow : restShadow,
        backgroundColor: isSelected ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))' : 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
        cursor: 'pointer',
        transition: 'background-color 80ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F7F8F9';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ds-surface, var(--ds-surface, #FFFFFF))';
        }
      }}
    >
      {/* Atlaskit checkbox cell */}
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
        <Checkbox
          isChecked={isSelected}
          onChange={() => onToggleSelect()}
          label=""
          size="medium"
        />
      </div>

      {columns.map((col) => (
        <div key={col.fieldId} role="gridcell" style={CELL_BASE}>
          {renderCell(col, item, hasChildren, isExpanded, onToggleExpand, onClick)}
        </div>
      ))}
    </div>
  );
});
